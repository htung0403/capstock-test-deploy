# Stock-Cap: Nền tảng Quản lý Danh mục Chứng khoán và Tư vấn AI

## Giới thiệu

**Stock-Cap** là một nền tảng quản lý danh mục đầu tư chứng khoán, cung cấp các công cụ cho nhà đầu tư để theo dõi cổ phiếu, quản lý giao dịch và danh mục đầu tư. Đặc biệt, dự án này đã được tích hợp các tính năng Trí tuệ Nhân tạo (AI) để cung cấp phân tích thị trường chuyên sâu và hỗ trợ tư vấn thông qua chatbot tương tác.

Dự án được xây dựng với kiến trúc **Client-Server** rõ ràng, sử dụng **Node.js (Express)** cho backend API và **React** cho frontend giao diện người dùng.

## Tính năng chính

*   **Quản lý người dùng:** Đăng ký, đăng nhập, quản lý hồ sơ.
*   **Quản lý danh mục đầu tư:** Xem, thêm, sửa, xóa danh mục.
*   **Quản lý giao dịch:** Mua/bán cổ phiếu, xem lịch sử giao dịch.
*   **Dữ liệu thị trường:** Xem thông tin cổ phiếu, giá hiện tại và lịch sử giá.
*   **Tin tức chứng khoán:** Cung cấp tin tức tài chính liên quan đến cổ phiếu.
*   **Phân tích AI:**
    *   **Phân tích cảm xúc tin tức:** Đánh giá tâm lý thị trường từ các bài báo.
    *   **Phân tích xu hướng giá:** Xác định xu hướng ngắn hạn và dài hạn dựa trên Đường trung bình động (MA).
    *   **Đánh giá toàn diện:** Kết hợp cảm xúc và xu hướng giá để đưa ra khuyến nghị về lợi nhuận/rủi ro.
*   **AI Chatbot:**
    *   **Trang chat riêng:** Một trang độc lập để trò chuyện với AI Advisor về các mã chứng khoán hoặc kiến thức thị trường chung.
    *   **Widget chat nổi:** Một khung chat nhỏ gọn trên trang chi tiết cổ phiếu, cung cấp ngữ cảnh về mã cổ phiếu đang xem.

## Cấu trúc dự án

Dự án được chia thành hai phần chính: `backend` và `frontend`.

```
Stock-Cap/
├── backend/
│   ├── ai_scripts/           # Chứa các script Python cho phân tích AI (cảm xúc, giá)
│   ├── controllers/          # Xử lý logic nghiệp vụ cho các API endpoint
│   ├── middlewares/          # Chứa các middleware (ví dụ: xác thực)
│   ├── models/               # Định nghĩa schema cho cơ sở dữ liệu MongoDB (Mongoose)
│   ├── node_modules/         # Các thư viện Node.js được cài đặt
│   ├── routes/               # Định nghĩa các tuyến đường API
│   ├── scheduler/            # Lên lịch các tác vụ định kỳ (ví dụ: làm mới dữ liệu)
│   ├── services/             # Chứa các service tương tác với bên ngoài (dữ liệu thị trường, AI)
│   ├── server.js             # Điểm khởi chạy của ứng dụng backend (Express)
│   ├── package.json          # Danh sách dependency và script của backend
│   └── .env                  # Cấu hình biến môi trường
└── frontend/
    ├── public/
    ├── src/
    │   ├── App.jsx           # Component chính của ứng dụng React, định nghĩa routes
    │   ├── components/       # Các component UI có thể tái sử dụng
    │   ├── contexts/         # Quản lý trạng thái toàn cục (xác thực, chủ đề, ngôn ngữ)
    │   ├── pages/            # Các trang chính của ứng dụng
    │   ├── services/         # Service để gọi API backend
    │   ├── utils/            # Các hàm tiện ích
    │   ├── index.css         # Styling CSS
    │   └── main.jsx          # Điểm khởi chạy của ứng dụng React
    ├── node_modules/
    ├── package.json
    └── vite.config.js        # Cấu hình Vite cho frontend
```

## Giải thích các tệp code quan trọng (Thay đổi và Bổ sung)

### Backend

*   **`backend/services/marketDataService.js`**
    *   **Mục đích:** Service này tương tác với các API dữ liệu thị trường bên ngoài (như Alpha Vantage, NewsAPI) để lấy giá cổ phiếu và tin tức.
    *   **Thay đổi (2025-10-20):**
        *   Đã thêm hàm `fetchStockNews` để lấy tin tức liên quan đến mã cổ phiếu từ NewsAPI và lưu vào MongoDB.
        *   Đảm bảo trường `content` trong `News` model được điền đúng cách từ phản hồi của NewsAPI.

*   **`backend/ai_scripts/sentiment_analyzer.py`**
    *   **Mục đích:** Script Python này thực hiện phân tích cảm xúc của văn bản (dựa trên `TextBlob`). Nó nhận một đoạn văn bản làm đầu vào và trả về "Positive", "Negative", hoặc "Neutral".
    *   **Bổ sung (2025-10-20):** Là một tệp mới được tạo.

*   **`backend/ai_scripts/price_analyzer.py`**
    *   **Mục đích:** Script Python này phân tích dữ liệu lịch sử giá cổ phiếu. Nó tính toán Đường trung bình động (MA) ngắn hạn và dài hạn để xác định xu hướng thị trường.
    *   **Bổ sung (2025-10-20):** Là một tệp mới được tạo.

*   **`backend/services/aiService.js`**
    *   **Mục đích:** Service này là cầu nối giữa các controller Node.js và các script Python phân tích AI. Nó chịu trách nhiệm gọi các script Python bằng `child_process.spawn`.
    *   **Thay đổi (2025-10-20):**
        *   Đã thêm hàm `getSentiment` để gọi `sentiment_analyzer.py`.
        *   Đã thêm hàm `analyzePriceHistory` để gọi `price_analyzer.py`.
        *   Đã sửa lỗi đường dẫn trong `path.join` để tương thích trên các hệ điều hành.

*   **`backend/controllers/aiController.js`**
    *   **Mục đích:** Xử lý các yêu cầu API liên quan đến phân tích AI.
    *   **Thay đổi (2025-10-20):**
        *   Đã thêm hàm `analyzeSentiment` để kích hoạt phân tích cảm xúc tin tức.
        *   Đã thêm hàm `analyzeStockPrice` để lấy dữ liệu lịch sử giá và kích hoạt phân tích giá.
        *   Đã thêm hàm `getComprehensiveAnalysis` để tổng hợp tin tức, cảm xúc, phân tích giá và đưa ra các đánh giá/khuyến nghị đơn giản về cổ phiếu.

*   **`backend/routes/aiRoutes.js`**
    *   **Mục đích:** Định nghĩa các tuyến đường API cho các chức năng phân tích AI.
    *   **Thay đổi (2025-10-20):**
        *   Đã thêm các tuyến `POST /sentiment`, `GET /price-analysis/:symbol`, và `GET /analysis/:symbol`.

*   **`backend/services/chatbotService.js`**
    *   **Mục đích:** Service này quản lý giao tiếp với Google Gemini API cho chức năng chatbot.
    *   **Bổ sung (2025-10-20):** Là một tệp mới được tạo. Khởi tạo Gemini client và cung cấp hàm `sendMessage` để tương tác với mô hình AI.

*   **`backend/controllers/chatbotController.js`**
    *   **Mục đích:** Xử lý các yêu cầu API cho chức năng chatbot.
    *   **Bổ sung (2025-10-20):** Là một tệp mới được tạo. Nó nhận tin nhắn và ngữ cảnh từ frontend, sau đó gọi `chatbotService.sendMessage`.

*   **`backend/routes/chatbotRoutes.js`**
    *   **Mục đích:** Định nghĩa các tuyến đường API cho chức năng chatbot AI.
    *   **Bổ sung (2025-10-20):** Là một tệp mới được tạo. Đã thêm tuyến `POST /chat`.

*   **`backend/server.js`**
    *   **Mục đích:** Điểm khởi chạy chính của ứng dụng backend, cấu hình Express, kết nối MongoDB và đăng ký tất cả các tuyến đường API.
    *   **Thay đổi (2025-10-20):**
        *   Đã tích hợp `aiRoutes` và `chatbotRoutes` vào ứng dụng Express.

### Frontend

*   **`frontend/src/pages/AIChatPage.jsx`**
    *   **Mục đích:** Trang React độc lập cung cấp giao diện chat đầy đủ để tương tác với AI Advisor.
    *   **Bổ sung (2025-10-20):**
        *   Đã tạo trang chat với UI hiện đại, lấy cảm hứng từ công nghệ tương lai (màu tối, gradient, bo tròn).
        *   Tích hợp với endpoint `POST /api/chatbot/chat` của backend.

*   **`frontend/src/App.jsx`**
    *   **Mục đích:** Component gốc của ứng dụng React, thiết lập các route và các nhà cung cấp ngữ cảnh (context providers).
    *   **Thay đổi (2025-10-20):**
        *   Đã thêm một `Route` mới cho `/chatbot`, cho phép người dùng điều hướng đến `AIChatPage`.

*   **`frontend/src/components/Navbar.jsx`**
    *   **Mục đích:** Thanh điều hướng chính của ứng dụng.
    *   **Thay đổi (2025-10-20):**
        *   Đã thêm một liên kết "AI Chat" mới vào dropdown menu của người dùng để truy cập trang chat AI.

*   **`frontend/src/components/AIChatWidget.jsx`**
    *   **Mục đích:** Component widget chat nổi, được sử dụng trên trang chi tiết cổ phiếu.
    *   **Bổ sung (2025-10-20):**
        *   Đã tạo widget với nút nổi để mở/đóng và khung chat nhỏ gọn.
        *   Tích hợp với endpoint `POST /api/chatbot/chat`, truyền `stockSymbol` làm ngữ cảnh cho AI.

*   **`frontend/src/pages/StockDetail.jsx`**
    *   **Mục đích:** Hiển thị thông tin chi tiết về một mã cổ phiếu.
    *   **Thay đổi (2025-10-20):**
        *   Đã thêm một panel "AI Advisor Analysis" để hiển thị kết quả phân tích AI toàn diện.
        *   Đã tích hợp `AIChatWidget` vào cuối trang để cung cấp chức năng chat AI theo ngữ cảnh của cổ phiếu đang xem.

## Hướng dẫn cài đặt và chạy

Để cài đặt và chạy dự án này, bạn cần có Node.js, npm/yarn và Python (với pip) được cài đặt trên hệ thống của bạn.

1.  **Sao chép kho lưu trữ:**
    ```bash
    git clone <URL_repository_của_bạn>
    cd Stock-Cap
    ```

2.  **Cấu hình biến môi trường Backend:**
    *   Tạo tệp `.env` trong thư mục `backend/` với nội dung sau (thay thế các khóa API của bạn):
        ```
        PORT=4000
        MONGO_URI=mongodb://127.0.0.1:27017/stockcap
        MONGO_DB=stockcap
        JWT_SECRET=your_jwt_secret_key_here
        ALPHA_VANTAGE_KEY=your_alpha_vantage_api_key_here
        NEWS_API_KEY=your_news_api_key_here
        GEMINI_API_KEY=your_gemini_api_key_here
        ```
    *   Bạn cần đăng ký tài khoản tại [NewsAPI.org](https://newsapi.org/) và [Google AI Studio](https://aistudio.google.com/) hoặc [Google Cloud Console](https://console.cloud.google.com/vertex-ai/model-garden) để lấy các khóa API cần thiết.

3.  **Cài đặt Dependency Backend:**
    ```bash
    cd backend
    npm install
    npm install @google/generative-ai # Cài đặt thêm thư viện Gemini API
    # Hoặc nếu bạn dùng yarn:
    # yarn install
    # yarn add @google/generative-ai
    ```

4.  **Cài đặt Dependency Python:**
    *   Đảm bảo bạn có `pip` được cài đặt.
    *   Trong thư mục `backend/`, chạy các lệnh sau:
        ```bash
        pip install textblob pandas numpy
        python -m textblob.download_corpora
        ```

5.  **Cài đặt Dependency Frontend:**
    ```bash
    cd ../frontend
    npm install
    # Hoặc nếu bạn dùng yarn:
    # yarn install
    ```

6.  **Chạy ứng dụng:**

    *   **Chạy Backend:**
        ```bash
        cd ../backend
        npm start
        # Hoặc với nodemon để tự động khởi động lại:
        # npm install -g nodemon
        # nodemon server.js
        ```

    *   **Chạy Frontend:**
        ```bash
        cd ../frontend
        npm run dev
        # Hoặc:
        # yarn dev
        ```

    *   Mở trình duyệt của bạn và truy cập `http://localhost:5173` (hoặc cổng mà Vite cung cấp) để xem ứng dụng.

## Hướng phát triển tương lai

Dự án này có tiềm năng phát triển rất lớn. Dưới đây là một số ý tưởng để mở rộng và cải thiện:

1.  **Cải thiện mô hình phân tích AI:**
    *   **Phân tích cảm xúc nâng cao:** Tích hợp các mô hình NLP phức tạp hơn (ví dụ: các mô hình dựa trên Transformer) để phân tích cảm xúc chính xác hơn và nhận diện các thực thể (công ty, sản phẩm) trong tin tức.
    *   **Dự đoán giá:** Phát triển các mô hình học sâu (Deep Learning) như LSTM, GRU để dự đoán giá cổ phiếu trong tương lai gần.
    *   **Phân tích kỹ thuật chuyên sâu:** Tích hợp nhiều chỉ báo kỹ thuật hơn (RSI, MACD, Bollinger Bands) và sử dụng chúng để tạo ra các tín hiệu giao dịch phức tạp hơn.
    *   **Phân tích cơ bản:** Tích hợp dữ liệu báo cáo tài chính và các chỉ số cơ bản để đánh giá sức khỏe tài chính của công ty.

2.  **Cải thiện AI Chatbot:**
    *   **Trạng thái cuộc hội thoại:** Lưu trữ lịch sử chat để AI có thể nhớ ngữ cảnh từ các tin nhắn trước đó.
    *   **Tích hợp công cụ:** Cho phép AI thực hiện các hành động trực tiếp trong ứng dụng (ví dụ: "Mua 10 cổ phiếu AAPL", "Cho tôi xem tin tức mới nhất về GOOGL").
    *   **Trả lời đa phương tiện:** Cho phép AI trả lời bằng biểu đồ, bảng biểu hoặc liên kết đến các dữ liệu liên quan.
    *   **Tùy chỉnh cá nhân hóa:** Cho phép người dùng tùy chỉnh "tính cách" hoặc phong cách tư vấn của AI.

3.  **Mở rộng tính năng cốt lõi của ứng dụng:**
    *   **Quản lý danh mục đầu tư nâng cao:** Thêm các tính năng như phân bổ tài sản, phân tích hiệu suất danh mục, đánh giá rủi ro danh mục.
    *   **Hệ thống cảnh báo thông minh:** Tích hợp các cảnh báo AI dựa trên điều kiện thị trường, tin tức hoặc các chỉ số phân tích.
    *   **Backtesting chiến lược:** Cho phép nhà đầu tư thử nghiệm các chiến lược giao dịch với dữ liệu lịch sử.
    *   **Tích hợp nhiều sàn giao dịch:** Hỗ trợ kết nối với nhiều sàn giao dịch khác nhau.

4.  **Cải thiện giao diện người dùng:**
    *   **Biểu đồ tương tác:** Nâng cấp biểu đồ với các tính năng tương tác phong phú hơn (phóng to, thu nhỏ, thêm chỉ báo).
    *   **Dashboard tùy chỉnh:** Cho phép người dùng tùy chỉnh các widget và thông tin hiển thị trên dashboard.
    *   **Gamification:** Thêm các yếu tố trò chơi hóa để tăng tính hấp dẫn.

---

