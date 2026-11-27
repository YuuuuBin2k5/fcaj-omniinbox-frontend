// FILE: src/hooks/useInbox.js
import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import * as api from "../services/apiClient.js";
import { reducer } from "../services/inboxReducer.js";
import { ApiError, isNetworkOrTimeoutError } from "../services/errors.js";
import { latencyTracker } from "../services/latencyTracker.js";

const initial = { conversations: [], messages: {} };

export function useInbox() {
  const [state, dispatch] = useReducer(reducer, initial);
  const [nextToken, setNextToken] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [realtime, setRealtime] = useState("connecting");
  const [sendingByConv, setSendingByConv] = useState({});
  const [retryingMessageId, setRetryingMessageId] = useState(null);
  const [assigningByConv, setAssigningByConv] = useState({});
  const [statusUpdatingByConv, setStatusUpdatingByConv] = useState({});
  const [unconfirmedByConv, setUnconfirmedByConv] = useState({});
  const [notice, setNotice] = useState("");
  const [msgToken, setMsgToken] = useState({});
  const [latencyTick, setLatencyTick] = useState(0);

  const selectedRef = useRef(null);
  selectedRef.current = selectedId;

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
    const r = await api.listConversations({ limit: 50 });
    dispatch({ type: "conversations", list: r.conversations || [] });
    setNextToken(r.nextToken ?? null);

    const sid = selectedRef.current;
    if (sid) {
      const m = await api.listMessages(sid, { limit: 50 });
      dispatch({ type: "messages", id: sid, list: m.messages || [] });
      setMsgToken((p) => ({ ...p, [sid]: m.nextToken ?? null }));
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
      try {
        const m = await api.listMessages(cid, { limit: 50 });
        dispatch({ type: "messages", id: cid, list: m.messages || [] });
        setMsgToken((p) => ({ ...p, [cid]: m.nextToken ?? null }));
        clearUnread(conv);
      } catch (e) {
        setNotice(e.message);
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

  const setStatus = useCallback(async (conv, status) => {
    const cid = conv.conversationId;
    setStatusUpdatingByConv((p) => ({ ...p, [cid]: true }));
    try {
      const r = await api.patchConversation(cid, { status });
      dispatch({ type: "conversation", conversation: r.conversation });
    } catch (e) {
      setNotice(e.message);
    } finally {
      setStatusUpdatingByConv((p) => ({ ...p, [cid]: false }));
    }
  }, []);

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
    [refresh]
  );

  const send = useCallback(async (conv, content, retryOfMessageId) => {
    const cid = conv.conversationId;
    if (retryOfMessageId) {
      setRetryingMessageId(retryOfMessageId);
    } else {
      setSendingByConv((p) => ({ ...p, [cid]: true }));
      setUnconfirmedByConv((p) => {
        if (!p[cid]) return p;
        const copy = { ...p };
        delete copy[cid];
        return copy;
      });
    }

    try {
      const r = await api.sendReply({ conversationId: cid, content, retryOfMessageId });
      if (r?.message) {
        dispatch({
          type: "event",
          evt: { event: "OUTBOUND_MESSAGE", conversation: r.conversation, message: r.message },
        });
      }
      if (r && r.ok === false) {
        setNotice(`Gửi tin tới kênh ngoài thất bại (${r.message?.errorDetail || "FAILED"}). Bạn có thể bấm Thử lại trên tin vừa tạo.`);
      }
      return { ok: Boolean(r?.ok), message: r?.message, recordedOnServer: Boolean(r?.message) };
    } catch (e) {
      if (isNetworkOrTimeoutError(e)) {
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
    sendingByConv,
    retryingMessageId,
    assigningByConv,
    statusUpdatingByConv,
    unconfirmedByConv,
    clearUnconfirmed,
    notice,
    clearNotice: () => setNotice(""),
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
