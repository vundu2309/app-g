# City Tycoon — bản thử LAN miễn phí

Game cờ tỷ phú 3D cho iOS và Android, phong cách thành phố hiện đại. Đây là **mốc thử kết nối hai người**, chưa phải game hoàn chỉnh hoặc bản Monopoly đủ luật.

## Có gì trong bản này?

- Máy chủ Node.js không dùng thư viện bên ngoài; chạy trên máy tính trong Wi-Fi tin cậy.
- Hai người tạo/vào phòng bằng mã, trạng thái do máy chủ quyết định.
- Bàn 40 ô, tiền ban đầu, lương qua xuất phát, mua đất, đấu giá, tiền thuê đất/ga/tiện ích, thuế và xử lý xúc xắc đôi/nhà tù cơ bản.
- Bộ mã Unity dựng bàn cờ 3D, thành phố trang trí, hai quân cờ, điều khiển camera và giao diện kết nối.
- Mã hành động chống xử lý lại cùng một yêu cầu; mã riêng của người chơi không xuất hiện trong dữ liệu chung.

## Chạy máy chủ

Cần Node.js 22 trở lên. Từ thư mục dự án:

```sh
cd server
npm test
npm start
```

Máy chủ in địa chỉ Wi-Fi, ví dụ `http://192.168.1.10:8787`. Giữ cửa sổ này mở. Cho phép kết nối mạng nội bộ nếu hệ điều hành hỏi. Không mở cổng router hoặc dùng máy chủ thử nghiệm này trên Internet.

## Mở bản 3D

Máy phát triển cần Unity Hub và Unity 6. Dự án dùng Editor `6000.0.85f1` cho Apple Silicon. Đã cài Editor và kích hoạt Unity Personal trên máy phát triển; bộ công cụ xuất Android/iOS chưa được cài.

1. Trong Unity Hub, chọn **Add project from disk**, mở thư mục `unity`.
2. Mở scene `Assets/Main.unity`. Script tự dựng bàn cờ khi scene chạy. Nếu cần tạo lại scene, chọn **City Tycoon → Prepare LAN scene**.
3. Bấm **Play**, nhập địa chỉ máy chủ và tên, bấm **Tạo phòng**.
4. Chạy thêm một bản game, hoặc bản trên điện thoại cùng Wi-Fi. Nhập cùng địa chỉ và mã phòng để tham gia.
5. Trong **Build Profiles**, thêm scene Main vào danh sách scene. Chọn Android hoặc iOS.

Prototype dùng HTTP LAN và tải trạng thái mỗi 0,75 giây để tránh phụ thuộc dịch vụ có phí. Trong Player Settings của bản thử, cho phép tải qua HTTP (Allow downloads over HTTP). Trên iOS cần cấu hình quyền mạng nội bộ `NSLocalNetworkUsageDescription` và ngoại lệ HTTP phù hợp trong bản Xcode xuất ra. Chỉ áp dụng ngoại lệ cho bản thử LAN. Chưa xác minh trên thiết bị thật.

Xây bản iOS cần Xcode trên Mac và ký ứng dụng. Hình thức chia sẻ iOS/TestFlight và tài khoản nhà phát triển là hạng mục riêng, không được cam kết miễn phí trong prototype này.

## Giới hạn hiện tại

- **Chưa có** hai bộ thẻ sự kiện, xây/bán nhà và khách sạn, thế chấp, giao dịch, thanh lý nợ đúng luật, bot, giới hạn thời gian và lưu/khôi phục ván.
- Ô sự kiện được thông báo và tạm bỏ qua. Hết tiền sẽ kết thúc bản thử; không đại diện cho quy trình phá sản hoàn chỉnh.
- Tòa nhà ở giữa bàn chỉ để trang trí, không đại diện cho nhà của người chơi.
- Ván hiện ở RAM; tắt máy chủ sẽ mất ván. Thông tin phòng ở client chưa được lưu; không thoát game giữa ván. Tạm mất Wi-Fi sẽ tự thử tải lại trạng thái khi game vẫn mở.
- Giao diện dùng chữ không dấu để tránh lệ thuộc font trong bản thử; chưa hoàn thiện giao diện cảm ứng.
- Máy chủ có giới hạn 100 phòng mỗi lần chạy, chưa có dọn phòng hoặc bảo vệ phù hợp để phát hành công khai.
- Phần Node.js có 12 kiểm thử. Unity đã được kiểm tra biên dịch bằng Editor; chưa kiểm tra hình ảnh và thao tác trên thiết bị thật.

## Các mốc tiếp theo

1. Chạy và kiểm tra bàn cờ Unity bằng hai client trong LAN.
2. Lưu ván, lưu phiên người chơi và xử lý gửi lại hành động an toàn khi mạng chậm.
3. Hoàn thiện luật theo một phiên bản Classic đã chốt: thẻ, nhà, thế chấp, giao dịch, phá sản và các tình huống ngoài lượt.
4. Hoàn thiện tiếng Việt, cảm ứng và hiệu năng; chạy thử chéo Android/iOS.
5. Đánh giá phương án online từ xa có hạn mức miễn phí, trước khi dùng bất kỳ dịch vụ trả phí nào.
