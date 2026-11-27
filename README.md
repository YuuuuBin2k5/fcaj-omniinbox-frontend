# OmniInbox Frontend — Agent Portal & Customer Simulator

Giao diện **OmniInbox Agent Portal** và **Omnichannel Customer Simulator** thuộc đồ án **AWS First Cloud Journey (FCAJ)** — hộp thư CSKH hợp nhất theo kiến trúc Serverless Event-Driven trên `ap-southeast-1`.

> [!IMPORTANT]
> **Phân định kênh thật & mô phỏng:**
> - **Telegram (`telegram`)** là kênh **THẬT duy nhất** (nhận qua Webhook thật có secret token và phản hồi 2 chiều qua Telegram Bot API).
> - **Shopee (`shopee`), Zalo (`zalo`), WebChat (`webchat`)** là các kênh **Mô phỏng (Simulated)** phát sinh từ trang **Customer Simulator** và luôn gắn nhãn **`Mô phỏng`** trên giao diện cũng như `deliveredVia: "simulator"`.

## Công nghệ sử dụng

- **React 19** + **Vite 6** + **Tailwind CSS v4** (`@tailwindcss/vite`)
- **Amazon Cognito SRP** qua `amazon-cognito-identity-js` (tự động xử lý `NEW_PASSWORD_REQUIRED` và refresh token)
- **API Gateway WebSocket** xác thực bằng **ticket một lần** (`POST /ws-ticket`, TTL 60s), ping giữ kết nối 5 phút, reconnect exponential backoff + `onResync`
- **`motion`** + **`lucide-react`**

## Khởi chạy nhanh ở Local (Mock Mode)

```bash
npm.cmd install
npm.cmd test
npm.cmd run dev
```

Ở Local Mock Mode (`VITE_USE_MOCK=true` trong `.env.local`), toàn bộ 7 REST route và 3 sự kiện WebSocket (`NEW_MESSAGE`, `OUTBOUND_MESSAGE`, `CONVERSATION_UPDATED`) chạy ngay trên trình duyệt bằng `localStorage` + `BroadcastChannel` (test 2 tab song song không cần AWS).

## Kết nối AWS thật (Cloud Mode)

Sao chép `.env.example` thành `.env.local` (khi dev cloud) hoặc `.env.production.local` (khi build CloudFront) — **không commit các file `.env*.local` lên Git**.

| Biến môi trường | Ý nghĩa | Nguồn bàn giao |
| :--- | :--- | :--- |
| `VITE_USE_MOCK` | `"true"` (local mock) hoặc `"false"` (AWS thật) | Tự cấu hình |
| `VITE_REST_API_URL` | Invoke URL stage `prod` của REST API Gateway | Hoài Nam |
| `VITE_WS_URL` | WebSocket URL (`wss://.../prod`) | Duy |
| `VITE_COGNITO_USER_POOL_ID` | Cognito User Pool ID (`ap-southeast-1_...`) | Vi |
| `VITE_COGNITO_CLIENT_ID` | Cognito App Client ID (`Public client`) | Vi |
| `VITE_AUTH_HEADER_PREFIX` | Để trống (gửi ID token thẳng) hoặc `Bearer` | Vi / Hoài Nam |
| `VITE_ENABLE_AI` | `"false"` mặc định; chỉ bật `"true"` nếu Go AI ở Ngày 9 | Duy |
| `VITE_ENABLE_FAULT_UI` | `"false"` mặc định; chỉ bật tạm khi test DLQ | Trung Nam |
| `VITE_AGENT_LIST` | Danh sách `agentId` khớp claim JWT (UUID-safe `resolveAgentId`) | Vi / Cả nhóm |

## Build Production & Bàn giao CloudFront

`package.json` gắn sẵn cổng kiểm tra `prebuild` (`scripts/check-env.mjs`) để **chặn tuyệt đối** việc build nhầm `VITE_USE_MOCK=true` hoặc còn placeholder lên S3/CloudFront:

```bash
# Đã điền giá trị AWS thật và VITE_USE_MOCK=false trong .env.production.local
npm.cmd run build
```

Sau khi build thành công, nén thư mục `dist/` bàn giao cho **Duy (Member 4)** tải lên **Amazon S3 (private) + CloudFront (OAC, custom error 403/404 -> `/index.html`)**.

## Fixtures & Hợp đồng dùng chung

- `src/fixtures/telegramUpdate.json` — Payload Telegram Bot webhook chuẩn.
- `src/fixtures/simulatorPayload.json` — Payload Simulator Shopee/Zalo/WebChat (kèm `sentAtMs` đo độ trễ Kịch bản 5B).
- `src/services/apiClient.js` — Tầng gọi REST/WS hợp nhất (luôn `encodeURIComponent(conversationId)` vì ID chứa `#`, cô lập `sendSimulatorMessage()`).
