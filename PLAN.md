# Kế hoạch triển khai 4 giờ – Dự án KAIZEN

## Phân công thành viên (Tách thư mục độc lập)

- **Member 1 (`server/`):** Xây dựng Node.js backend, bộ đọc file Excel, logic mô phỏng SMV & tích hợp Gemini API.
- **Member 2 (`client/` & `Dockerfile`):** Dựng giao diện React Dashboard, biểu đồ Trước/Sau và deploy lên Google Cloud Run.
- **Member 3 (`data/` & `docs/`):** Chuẩn bị dữ liệu mẫu chuyền may Polo, tinh chỉnh System Prompt cho Gemini và quay/dựng video demo 2 phút.

## Lộ trình thực hiện tại điểm thi

- **Giờ 1 (0:00 – 1:00):** Hoàn thiện parser dữ liệu Excel, công thức tính nút thắt cổ chai và khung giao diện tải file.
- **Giờ 2 (1:00 – 2:00):** Kết nối Gemini API (ép kiểu JSON) trả về phương án điều chuyển nhân sự + gá cữ may.
- **Giờ 3 (2:00 – 3:00):** Hoàn thiện biểu đồ so sánh Trước/Sau (Năng suất, WIP, Chi phí/áo, 0% sa thải).
- **Giờ 4 (3:00 – 4:00):** Đóng gói Docker, deploy Google Cloud Run, quay video demo 2 phút và nộp bài.
