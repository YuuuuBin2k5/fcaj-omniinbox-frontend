// FILE: src/hooks/useInbox.js
import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import * as api from "../services/apiClient.js";
import { getAgentName, USE_MOCK } from "../services/auth.js";
import { reducer } from "../services/inboxReducer.js";
import { ApiError, isNetworkOrTimeoutError } from "../services/errors.js";
import { latencyTracker } from "../services/latencyTracker.js";
import { formatAgentShort } from "../services/uiFormat.js";

const initial = { conversations: [], messages: {} };
const REQUEST_ID_TTL_MS = 60_000;

export function useInbox() {
  const [state, dispatch] = useReducer(reducer, initial);
  const [nextToken, setNextToken] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [realtime, setRealtime] = useState("connecting");
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessagesByConv, setLoadingMessagesByConv] = useState({});
  const [sendingByConv, setSendingByConv] = useState({});
  const [pendingOutgoingByConv, setPendingOutgoingByConv] = useState({});
  const [retryingMessageId, setRetryingMessageId] = useState(null);
  const [assigningByConv, setAssigningByConv] = useState({});
  const [statusUpdatingByConv, setStatusUpdatingByConv] = useState({});
  const [unconfirmedByConv, setUnconfirmedByConv] = useState({});
  const [notice, setNotice] = useState("");
  const [toast, setToast] = useState(null);
  const [msgToken, setMsgToken] = useState({});
  const [latencyTick, setLatencyTick] = useState(0);

  const sendRequests = useRef(new Map());
  const refreshSequence = useRef(0);
  const selectedRef = useRef(null);
  selectedRef.current = selectedId;
  const messagesRef = useRef(state.messages);
  messagesRef.current = state.messages;
  const toastTimerRef = useRef(null);

  const dismissToast = useCallback(() => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
      toastTimerRef.current = null;
    }
    setToast(null);
  }, []);

  const showToast = useCallback((nextToast) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    const entry = { id: Date.now(), ...nextToast };
    setToast(entry);
    toastTimerRef.current = setTimeout(() => {
      setToast((cur) => (cur?.id === entry.id ? null : cur));
    }, 3400);
  }, []);

  useEffect(() => () => toastTimerRef.current && clearTimeout(toastTimerRef.current), []);

  // Chỉ tự xóa dấu chưa đọc khi CHÍNH nhân viên phụ trách đang xem hội thoại (tránh đồng nghiệp xem lướt làm chìm ca unassigned)
  const clearUnread = useCallback((conv, { checkVisibility = false } = {}) => {
    const me = getAgentName();
    if (!conv || !(Number(conv.unreadCount) > 0) || !me || conv.assignedAgent !== me) return;
    if (checkVisibility && typeof document !== "undefined" && document.visibilityState !== "visible") {
      return;
    }
    api
      .patchConversation(conv.conversationId, {
        unreadCount: 0,
        expectedLastMessageAt: conv.lastMessageAt,
      })
      .then((r) => {
        if (r?.conversation) dispatch({ type: "conversation", conversation: r.conversation });
      })
      .catch((err) => {
        if (err instanceof ApiError && err.status === 409 && err.body?.conversation) {
          dispatch({ type: "conversation", conversation: err.body.conversation });
        }
      });
  }, []);

  const toggleUnread = useCallback(
    async (conv) => {
      if (!conv) return;
      const nextUnread = Number(conv.unreadCount) > 0 ? 0 : 1;
      try {
        const r = await api.patchConversation(conv.conversationId, { unreadCount: nextUnread });
        if (r?.conversation) dispatch({ type: "conversation", conversation: r.conversation });
        showToast({
          tone: "info",
          text: nextUnread > 0 ? "Đã đánh dấu chưa đọc" : "Đã đánh dấu đã đọc",
        });
      } catch (e) {
        setNotice(e.message);
      }
    },
    [showToast]
  );

  const refresh = useCallback(async () => {
    const sequence = ++refreshSequence.current;
    try {
      const r = await api.listConversations({ limit: 50 });
      if (sequence !== refreshSequence.current) return;
      dispatch({ type: "conversations", list: r.conversations || [] });
      setNextToken(r.nextToken ?? null);

      const sid = selectedRef.current;
      if (sid) {
        const m = await api.listMessages(sid, { limit: 50 });
        if (sequence !== refreshSequence.current) return;
        dispatch({ type: "messages", id: sid, list: m.messages || [] });
        setMsgToken((p) => ({ ...p, [sid]: m.nextToken ?? null }));
      }
    } finally {
      setLoadingConversations(false);
    }
  }, []);

  useEffect(() => {
    refresh().catch((e) => setNotice(e.message));
    const rt = api.connectRealtime({
      clientType: "portal",
      onEvent: (evt) => {
        if (evt.event === "NEW_MESSAGE" && evt.message) {
          const sample = latencyTracker.record(evt.message);
          if (sample) setLatencyTick((t) => t + 1);
        }
        dispatch({ type: "event", evt });
        const c = evt.conversation;
        if (evt.event === "NEW_MESSAGE" && c && c.conversationId === selectedRef.current) {
          clearUnread(c, { checkVisibility: true });
        }
      },
      onStatus: setRealtime,
      onResync: () => refresh().catch(() => {}),
    });
    return () => rt.close();
  }, [refresh, clearUnread]);

  const loadMore = useCallback(async () => {
    if (!nextToken) return;
    const r = await api.listConversations({ limit: 50, nextToken });
    dispatch({ type: "moreConversations", list: r.conversations || [] });
    setNextToken(r.nextToken ?? null);
  }, [nextToken]);

  const select = useCallback(
    async (conv) => {
      if (!conv) {
        setSelectedId(null);
        return;
      }
      const cid = conv.conversationId;
      setSelectedId(cid);
      const needsSkeleton = !messagesRef.current[cid]?.length;
      if (needsSkeleton) {
        setLoadingMessagesByConv((p) => ({ ...p, [cid]: true }));
      }
      try {
        const m = await api.listMessages(cid, { limit: 50 });
        dispatch({ type: "messages", id: cid, list: m.messages || [] });
        setMsgToken((p) => ({ ...p, [cid]: m.nextToken ?? null }));
        clearUnread(conv);
      } catch (e) {
        setNotice(e.message);
      } finally {
        if (needsSkeleton) {
          setLoadingMessagesByConv((p) => ({ ...p, [cid]: false }));
        }
      }
    },
    [clearUnread]
  );

  const loadOlder = useCallback(async () => {
    const id = selectedRef.current;
    const tok = id && msgToken[id];
    if (!tok) return;
    const m = await api.listMessages(id, { limit: 50, nextToken: tok });
    dispatch({ type: "olderMessages", id, list: m.messages || [] });
    setMsgToken((p) => ({ ...p, [id]: m.nextToken ?? null }));
  }, [msgToken]);

  const setStatus = useCallback(
    async (conv, status) => {
      const cid = conv.conversationId;
      const prevStatus = conv.status;
      setStatusUpdatingByConv((p) => ({ ...p, [cid]: true }));
      try {
        const r = await api.patchConversation(cid, { status });
        dispatch({ type: "conversation", conversation: r.conversation });
        if (status === "RESOLVED" && prevStatus !== "RESOLVED") {
          showToast({
            tone: "success",
            text: `Đã hoàn tất hội thoại ${conv.customerName}`,
            undoLabel: "Hoàn tác",
            onUndo: () => setStatus(r.conversation, prevStatus || "IN_PROGRESS"),
          });
        } else if (status === "OPEN" && prevStatus === "RESOLVED") {
          showToast({ tone: "info", text: `Đã mở lại hội thoại ${conv.customerName}` });
        }
      } catch (e) {
        setNotice(e.message);
      } finally {
        setStatusUpdatingByConv((p) => ({ ...p, [cid]: false }));
      }
    },
    [showToast]
  );

  const assign = useCallback(
    async (conv, agent) => {
      const cid = conv.conversationId;
      setAssigningByConv((p) => ({ ...p, [cid]: true }));
      try {
        const r = await api.patchConversation(cid, {
          assignedAgent: agent,
          expectedAssignedAgent: conv.assignedAgent,
        });
        dispatch({ type: "conversation", conversation: r.conversation });
        showToast({
          tone: "success",
          text:
            agent === "unassigned"
              ? "Đã bỏ phân công hội thoại"
              : `Đã gán hội thoại cho ${formatAgentShort(agent)}`,
        });
      } catch (e) {
        if (e instanceof ApiError && e.status === 409) {
          const cur = e.body?.conversation;
          if (cur) {
            dispatch({ type: "conversation", conversation: cur });
          } else {
            refresh().catch(() => {});
          }
          setNotice(
            `Xung đột phân công (409): Hội thoại đã được ${
              cur?.assignedAgent || "người khác"
            } nhận trước. Danh sách đã cập nhật.`
          );
        } else {
          setNotice(e.message);
        }
      } finally {
        setAssigningByConv((p) => ({ ...p, [cid]: false }));
      }
    },
    [refresh, showToast]
  );

  const send = useCallback(async (conv, content, retryOfMessageId) => {
    const cid = conv.conversationId;
    if (retryOfMessageId) {
      setRetryingMessageId(retryOfMessageId);
    } else {
      setSendingByConv((p) => ({ ...p, [cid]: true }));
      setPendingOutgoingByConv((p) => ({
        ...p,
        [cid]: { content, createdAt: new Date().toISOString() },
      }));
      setUnconfirmedByConv((p) => {
        if (!p[cid]) return p;
        const copy = { ...p };
        delete copy[cid];
        return copy;
      });
    }

    const requestKey = JSON.stringify([cid, content.trim()]);
    let requestId;
    if (!retryOfMessageId && !USE_MOCK) {
      const nowMs = Date.now();
      const cached = sendRequests.current.get(requestKey);
      if (cached && nowMs - cached.at < REQUEST_ID_TTL_MS) {
        requestId = cached.id;
      } else {
        requestId = `${nowMs}-${crypto.randomUUID()}`;
        sendRequests.current.set(requestKey, { id: requestId, at: nowMs });
      }
    }

    try {
      const r = await api.sendReply({ conversationId: cid, content, retryOfMessageId, requestId });
      if (r?.conversation) {
        dispatch({ type: "conversation", conversation: r.conversation });
      }
      if (r?.message) {
        dispatch({
          type: "event",
          evt: { event: "OUTBOUND_MESSAGE", conversation: r.conversation, message: r.message },
        });
        sendRequests.current.delete(requestKey);
      }
      if (r?.message?.status === "UNKNOWN" || r?.message?.status === "SENDING") {
        setNotice("Chưa xác nhận được Telegram đã nhận tin. Bấm Đồng bộ trên tin nhắn để kiểm tra trước khi gửi lại.");
      } else if (r && r.ok === false) {
        setNotice(
          `Gửi tin tới kênh ngoài thất bại (${r.message?.errorDetail || "FAILED"}). Bạn có thể bấm Thử lại trên tin vừa tạo.`
        );
      }
      return { ok: Boolean(r?.ok), message: r?.message, recordedOnServer: Boolean(r?.message) };
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) {
        sendRequests.current.delete(requestKey);
        if (e.body?.conversation) {
          dispatch({ type: "conversation", conversation: e.body.conversation });
        }
        if (e.body?.message) {
          dispatch({ type: "event", evt: { event: "OUTBOUND_MESSAGE", message: e.body.message } });
          setNotice("Tin này đang được xử lý hoặc chưa xác nhận kết quả gửi.");
          return { ok: false, recordedOnServer: true, message: e.body.message };
        }
        if (e.body?.error === "CONVERSATION_ASSIGNED_TO_OTHER") {
          setNotice(
            `Không thể gửi (409): Hội thoại đang do ${
              e.body?.conversation?.assignedAgent || "người khác"
            } phụ trách. Bấm 'Nhận lại' trước khi gửi.`
          );
          return { ok: false, conflict: true };
        }
      }
      if (isNetworkOrTimeoutError(e) || (e instanceof ApiError && e.status >= 500)) {
        try {
          const m = await api.listMessages(cid, { limit: 50 });
          dispatch({ type: "messages", id: cid, list: m.messages || [] });
          setMsgToken((p) => ({ ...p, [cid]: m.nextToken ?? null }));
        } catch {
          // ignore secondary sync failure
        }
        setUnconfirmedByConv((p) => ({
          ...p,
          [cid]:
            "Chưa xác nhận được kết quả gửi (tin có thể đã gửi tới khách). Vui lòng kiểm tra lịch sử trước khi gửi lại.",
        }));
        return { ok: false, networkUnconfirmed: true };
      }
      setNotice(e.message);
      return { ok: false, error: e.message };
    } finally {
      if (retryOfMessageId) {
        setRetryingMessageId(null);
      } else {
        setSendingByConv((p) => ({ ...p, [cid]: false }));
        setPendingOutgoingByConv((p) => {
          if (!p[cid]) return p;
          const copy = { ...p };
          delete copy[cid];
          return copy;
        });
      }
    }
  }, []);

  const clearUnconfirmed = useCallback((cid) => {
    for (const k of sendRequests.current.keys()) {
      if (k.startsWith(`[${JSON.stringify(cid)},`)) {
        sendRequests.current.delete(k);
      }
    }
    setUnconfirmedByConv((p) => {
      if (!p[cid]) return p;
      const copy = { ...p };
      delete copy[cid];
      return copy;
    });
  }, []);

  return {
    conversations: state.conversations,
    messages: state.messages,
    selectedId,
    nextToken,
    hasOlder: Boolean(selectedId && msgToken[selectedId]),
    realtime,
    loadingConversations,
    loadingMessagesByConv,
    sendingByConv,
    pendingOutgoingByConv,
    retryingMessageId,
    assigningByConv,
    statusUpdatingByConv,
    unconfirmedByConv,
    clearUnconfirmed,
    notice,
    clearNotice: () => setNotice(""),
    toast,
    dismissToast,
    select,
    loadMore,
    loadOlder,
    setStatus,
    toggleUnread,
    assign,
    send,
    refresh,
    latencyStats: latencyTracker.getStats(),
    latencyTick,
  };
}
