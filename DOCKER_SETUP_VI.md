# Chạy AI Writing Coach như service bằng Docker

## Kiến trúc

Browser -> Writing Coach container -> Ollama trên Windows (GPU)
                          |
                          +-> SQLite Docker volume
                          |
                          +-> Cloudflare Tunnel (tùy chọn)

Ollama KHÔNG được public ra Internet. Chỉ web app được publish qua Cloudflare Tunnel.

## 1. Cho Docker container truy cập Ollama trên Windows

Ollama trên Windows mặc định có thể chỉ lắng nghe localhost. Để container gọi được Ollama qua `host.docker.internal`, đặt biến môi trường Windows:

- Variable: `OLLAMA_HOST`
- Value: `0.0.0.0:11434`

Sau đó Quit Ollama ở system tray và mở lại Ollama.

Kiểm tra PowerShell:

```powershell
ollama list
Invoke-RestMethod http://127.0.0.1:11434/api/tags
```

Không port-forward 11434 trên router và không publish 11434 qua Cloudflare.

## 2. Start Writing Coach

Trong thư mục project:

```powershell
Copy-Item .env.example .env
notepad .env
```

Mặc định đã là:

```env
OLLAMA_MODEL=qwen3:8b
OLLAMA_URL=http://host.docker.internal:11434
ALLOW_FALLBACK=false
```

Start:

```powershell
docker compose up -d --build
```

Hoặc:

```powershell
.\start_docker.ps1
```

Truy cập local:

http://127.0.0.1:8000

Xem trạng thái/log:

```powershell
docker compose ps
docker compose logs -f writing-coach
```

Restart:

```powershell
docker compose restart writing-coach
```

Stop:

```powershell
docker compose down
```

Dữ liệu SQLite nằm trong named volume `writing_data`, nên `docker compose down` không xóa bài viết. Không dùng `docker compose down -v` nếu muốn giữ dữ liệu.

## 3. Tự khởi động

Compose dùng `restart: unless-stopped`, nên container tự chạy lại khi Docker engine khởi động. Trên Windows, bật Docker Desktop > Settings > General > Start Docker Desktop when you sign in.

## 4. Publish ra Internet bằng Cloudflare Tunnel (khuyên dùng)

Tạo Named Tunnel trong Cloudflare Dashboard. Tạo Published application/route, ví dụ:

- Hostname: `writing.example.com`
- Service URL: `http://writing-coach:8000`

Khi Cloudflare cung cấp tunnel token, dán vào `.env`:

```env
CLOUDFLARE_TUNNEL_TOKEN=your-token-here
```

Sau đó:

```powershell
docker compose --profile public up -d --build
```

hoặc:

```powershell
.\start_public.ps1
```

### Bắt buộc nên bật Access trước khi dùng lâu dài

App MVP hiện chưa có tài khoản/login riêng. Nếu hostname được publish công khai mà không có Access policy, người biết URL có thể sử dụng app và GPU của máy bạn.

Trong Cloudflare Zero Trust/Access, tạo policy chỉ cho email/tài khoản của bạn truy cập hostname Writing Coach.

## 5. Update source sau này

Sau khi sửa source:

```powershell
docker compose up -d --build
```

SQLite volume vẫn được giữ nguyên.
