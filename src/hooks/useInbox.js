// FILE: src/hooks/useInbox.js
import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import * as api from "../services/apiClient.js";
import { USE_MOCK } from "../services/auth.js";
import { reducer } from "../services/inboxReducer.js";
import { ApiError, isNetworkOrTimeoutError } from "../services/errors.js";
import { latencyTracker } from "../services/latencyTracker.js";
import { formatAgentShort } from "../services/uiFormat.js";

const initial = { conversations: [], messages: {} };

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

  // Baseline tích hợp đầu: "dấu chưa đọc chung của nhóm"
  const clearUnread = useCallback((conv) => {
    if (conv && conv.unreadCount > 0) {
      api
        .patchConversation(conv.conversationId, { unreadCount: 0 })
        .then((r) => {
          if (r?.conversation) dispatch({ type: "conversation", conversation: r.conversation });
        })
        .catch(() => {});
    }
  }, []);

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
      onEvent: (evt) => {
        if (evt.event === "NEW_MESSAGE" && evt.message) {
          const sample = latencyTracker.record(evt.message);
          if (sample) setLatencyTick((t) => t + 1);
        }
        dispatch({ type: "event", evt });
        const c = evt.conversation;
        if (evt.event === "NEW_MESSAGE" && c && c.conversationId === selectedRef.current) {
          clearUnread(c);
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
      requestId = sendRequests.current.get(requestKey) || `${Date.now()}-${crypto.randomUUID()}`;
      sendRequests.current.set(requestKey, requestId);
    }

    try {
      const r = await api.sendReply({ conversationId: cid, content, retryOfMessageId, requestId });
      if (r?.message) {
        dispatch({
          type: "event",
          evt: { event: "OUTBOUND_MESSAGE", conversation: r.conversation, message: r.message },
        });
      }
      if (r?.message && ["SENT", "FAILED"].includes(r.message.status)) {
        sendRequests.current.delete(requestKey);
      }
      if (r?.message?.status === "UNKNOWN" || r?.message?.status === "SENDING") {
        setNotice("Chưa xác nhận được Telegram đã nhận tin. Kiểm tra phía khách trước khi gửi lại.");
      } else if (r && r.ok === false) {
        setNotice(`Gửi tin tới kênh ngoài thất bại (${r.message?.errorDetail || "FAILED"}). Bạn có thể bấm Thử lại trên tin vừa tạo.`);
      }
      return { ok: Boolean(r?.ok), message: r?.message, recordedOnServer: Boolean(r?.message) };
    } catch (e) {
      if (e instanceof ApiError && e.status === 409 && e.body?.message) {
        dispatch({ type: "event", evt: { event: "OUTBOUND_MESSAGE", message: e.body.message } });
        setNotice("Tin này đang được xử lý hoặc chưa xác nhận kết quả gửi.");
        return { ok: false, recordedOnServer: true, message: e.body.message };
      }
      if (isNetworkOrTimeoutError(e) || (e instanceof ApiError && e.status >= 500)) {
        // Không tự kết luận đã gửi hay chưa dựa vào khớp text; đồng bộ lại lịch sử và giữ nháp để nhân viên tự quyết
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
    assign,
    send,
    refresh,
    latencyStats: latencyTracker.getStats(),
    latencyTick,
  };
}
