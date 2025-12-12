# Tích hợp Tusky Storage vào Dự án

## Giới thiệu

Dự án này đã được tích hợp với **Tusky** - một nền tảng lưu trữ phi tập trung sử dụng Walrus làm backend, cung cấp:

- 🔒 **Mã hóa End-to-End**: Dữ liệu được mã hóa trước khi upload
- 🌐 **Lưu trữ phi tập trung**: Sử dụng Walrus protocol trên Sui blockchain
- 🔗 **Magic Links**: Chia sẻ file riêng tư với link có thời hạn
- 🗄️ **Private Vaults**: Tạo các kho lưu trữ riêng tư
- 📦 **1GB miễn phí**: Không cần token để bắt đầu

## Cài đặt

Package Tusky SDK đã được cài đặt trong `package.json`:

```json
{
  "dependencies": {
    "@tusky-io/ts-sdk": "^0.41.0"
  }
}
```

## Cấu trúc File

```
src/
├── utils/
│   ├── tuskyUpload.ts          # Tusky utility functions
│   └── walrusUpload.ts         # Walrus fallback (original)
├── examples/
│   └── tuskyExamples.ts        # Ví dụ sử dụng Tusky
└── app/
    └── [locale]/
        └── my-profile/
            └── page.tsx        # Đã tích hợp Tusky toggle
```

## Cách sử dụng

### 1. Import các function cần thiết

```typescript
import {
  uploadImageToTusky,
  getTuskyUrl,
  initTuskyClient,
} from "@/utils/tuskyUpload";
```

### 2. Upload ảnh cơ bản

```typescript
const file = // ... File object từ input

try {
  const result = await uploadImageToTusky(file);

  console.log("Blob ID:", result.blobId);
  console.log("URL:", result.url);
  console.log("Metadata:", result.metadata);
} catch (error) {
  console.error("Upload failed:", error);
}
```

### 3. Upload ảnh riêng tư (có mã hóa)

```typescript
const result = await uploadImageToTusky(file, {
  isPrivate: true,
  metadata: {
    description: "Private photo",
    uploadedBy: "user-address",
  },
});
```

### 4. Sử dụng trong React Component

```tsx
"use client";

import { uploadImageToTusky } from "@/utils/tuskyUpload";
import { useState } from "react";

export function MyComponent() {
  const [uploading, setUploading] = useState(false);
  const [imageUrl, setImageUrl] = useState("");

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      const result = await uploadImageToTusky(file);
      setImageUrl(result.url);
    } catch (error) {
      console.error(error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <input
        type="file"
        accept="image/*"
        onChange={handleUpload}
        disabled={uploading}
      />
      {imageUrl && <img src={imageUrl} alt="Uploaded" />}
    </div>
  );
}
```

## Tính năng đã tích hợp trong My Profile

Trong trang **My Profile** (`src/app/[locale]/my-profile/page.tsx`), người dùng có thể:

1. **Toggle giữa Tusky và Walrus**:

   - Sử dụng nút toggle để chọn storage provider
   - Mặc định sử dụng Tusky

2. **Upload Avatar**:

   - Chọn ảnh từ máy tính
   - Tự động upload lên Tusky hoặc Walrus
   - Hiển thị progress và thông báo

3. **Update Profile**:
   - Cập nhật avatar mới
   - Tự động upload lên storage đã chọn

## API Functions

### `uploadImageToTusky(file, options?)`

Upload ảnh lên Tusky

**Parameters:**

- `file: File` - File object cần upload
- `options?: Object`
  - `isPrivate?: boolean` - Mã hóa file (default: false)
  - `metadata?: Record<string, any>` - Metadata tùy chỉnh

**Returns:** `Promise<TuskyUploadResponse>`

```typescript
{
  blobId: string;
  url: string;
  metadata: {
    name: string;
    size: number;
    type: string;
  }
}
```

### `getTuskyUrl(blobId)`

Lấy public URL từ blob ID

**Parameters:**

- `blobId: string` - ID của blob

**Returns:** `string` - Public URL

### `uploadImageDataToTusky(imageData, fileName?)`

Upload từ base64 string hoặc URL

**Parameters:**

- `imageData: string` - Base64 data URL hoặc HTTP URL
- `fileName?: string` - Tên file (optional)

**Returns:** `Promise<TuskyUploadResponse>`

### `createPrivateVault(name, description?)`

Tạo private vault để lưu trữ dữ liệu mã hóa

**Parameters:**

- `name: string` - Tên vault
- `description?: string` - Mô tả (optional)

**Returns:** `Promise<any>` - Vault object

### `getUserAssets(options?)`

Lấy danh sách file của user

**Parameters:**

- `options?: Object`
  - `limit?: number` - Số lượng tối đa (default: 100)
  - `offset?: number` - Vị trí bắt đầu (default: 0)

**Returns:** `Promise<any[]>` - Danh sách assets

### `createMagicLink(blobId, options?)`

Tạo magic link để chia sẻ file riêng tư

**Parameters:**

- `blobId: string` - ID của blob cần share
- `options?: Object`
  - `expiresIn?: number` - Thời gian hết hạn (giây)
  - `maxDownloads?: number` - Số lần download tối đa

**Returns:** `Promise<string>` - Magic link URL

## Environment Variables (Optional)

Nếu bạn có Tusky API key, thêm vào `.env.local`:

```bash
NEXT_PUBLIC_TUSKY_API_KEY=your-api-key-here
```

Sau đó khởi tạo client:

```typescript
import { initTuskyClient } from "@/utils/tuskyUpload";

initTuskyClient(process.env.NEXT_PUBLIC_TUSKY_API_KEY);
```

## Ví dụ nâng cao

Xem file `src/examples/tuskyExamples.ts` để biết thêm các ví dụ:

- ✅ Basic image upload
- ✅ Private/encrypted upload
- ✅ Upload from base64 or URL
- ✅ Create private vault
- ✅ List user's assets
- ✅ Create magic links
- ✅ React component example
- ✅ Next.js API route example

## So sánh Tusky vs Walrus

| Tính năng             | Tusky       | Walrus     |
| --------------------- | ----------- | ---------- |
| Lưu trữ phi tập trung | ✅          | ✅         |
| Mã hóa E2E            | ✅          | ❌         |
| Magic Links           | ✅          | ❌         |
| Private Vaults        | ✅          | ❌         |
| API/SDK               | ✅          | ⚠️ Limited |
| Miễn phí 1GB          | ✅          | ✅         |
| NFT Support           | ✅ (Coming) | ✅         |

## Lưu ý

1. **File size limit**: Tối đa 10MB cho mỗi file
2. **File types**: Chỉ hỗ trợ ảnh (image/\*)
3. **Network**: Hiện tại sử dụng Walrus Testnet
4. **Authentication**: Có thể dùng Sui wallet hoặc Google/Twitch account

## Troubleshooting

### Lỗi upload

```typescript
try {
  const result = await uploadImageToTusky(file);
} catch (error) {
  if (error instanceof Error) {
    // Check error message
    console.error(error.message);

    // Common errors:
    // - "Please select a valid image file"
    // - "Image size must be less than 10MB"
    // - "Failed to upload image to Tusky"
  }
}
```

### Kiểm tra kết nối

```typescript
import { getTuskyClient } from "@/utils/tuskyUpload";

const client = getTuskyClient();
console.log("Tusky client:", client);
```

## Resources

- 📚 [Tusky Documentation](https://docs.tusky.io/)
- 🌐 [Tusky Website](https://tusky.io/)
- 🦭 [Walrus Documentation](https://docs.walrus.site/)
- ⛓️ [Sui Blockchain](https://sui.io/)

## Support

Nếu gặp vấn đề, vui lòng:

1. Check console logs
2. Xem error messages
3. Kiểm tra network connection
4. Tham khảo examples trong `src/examples/tuskyExamples.ts`

---

**Phát triển bởi**: Check-in NFT Sui Team  
**Phiên bản**: 1.0.0  
**Ngày cập nhật**: December 2025
