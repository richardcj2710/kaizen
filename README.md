# KAIZEN

> Cân bằng chuyền may nhân văn bằng Mô phỏng & AI – Tối ưu năng suất, 0% sa thải.

## 1. Bài toán giải quyết

Tại các xưởng may gia công vừa và nhỏ, khu vực sản xuất trực tiếp (**B10 May theo bó $\rightarrow$ B11 QC $\rightarrow$ B12 Đóng khuy, ủi**) thường là "điểm mù" của các phần mềm quản trị vĩ mô. Quản đốc thường điều phối nhân sự và xử lý nút thắt cổ chai (Bottleneck) bằng cảm tính, gây ùn tắc bán thành phẩm (WIP), trễ đơn hàng và lãng phí chi phí nhân công.

## 2. Giải pháp

**KAIZEN** là ứng dụng web giúp quản lý xưởng "thử trước, cải tiến sau" thông qua 4 bước:

1. **Nhập dữ liệu chuyền may:** Tải lên file Excel chứa thông số công đoạn (Số lao động, thời gian chuẩn SMV, hàng tồn WIP, chi phí lương & thiết bị hỗ trợ).
2. **Mô phỏng hiện trạng:** Tính toán năng suất từng trạm theo chuẩn Kỹ thuật Công nghiệp (IE) và cảnh báo trực quan trạm nút thắt cổ chai.
3. **Đề xuất Kaizen nhân văn (Gemini API):** Phân tích dữ liệu và đưa ra phương án điều chuyển nhân sự kết hợp gá cữ may (Jig Sewing) / máy chuyên dùng lập trình tự động với nguyên tắc **không sa thải công nhân**.
4. **Kiểm chứng Trước / Sau:** Chạy mô phỏng lại phương án mới để đối chiếu mức tăng năng suất, giảm chi phí trên từng sản phẩm và thời gian hoàn vốn thiết bị.

## 3. Công nghệ sử dụng

- **Frontend:** React, Vite, Tailwind CSS, Recharts
- **Backend:** Node.js, Express
- **AI Engine:** Google Gemini API (Structured JSON Output)
- **Deployment:** Docker, Google Cloud Run

## 4. Tiến độ triển khai (Hackathon)

- [x] Chuẩn bị khung dự án, dữ liệu mẫu chuẩn SMV ngành may & tài liệu thiết kế (Prep < 30%)
- [x] Reconfig codespaces
- [ ] Module đọc file Excel & Engine mô phỏng năng suất chuyền may
- [ ] Tích hợp Gemini API đề xuất cân bằng chuyền & gá cữ kỹ thuật
- [ ] Giao diện trực quan hóa biểu đồ Trước / Sau
- [ ] Triển khai trên Google Cloud Run & Quay video demo 2 phút

## 5. Nhóm thực hiện

Dự án tham gia **GDG DevFest Miền Trung 2026 – Đà Nẵng**.
