# Quick Start: Tusky Integration

## Tích hợp Tusky vào Profile Page ✅

### Files đã tạo:

1. **`src/utils/tuskyUpload.ts`** - Core utility functions
2. **`src/examples/tuskyExamples.ts`** - Usage examples
3. **`src/components/TuskyUploader.tsx`** - React components
4. **`TUSKY_INTEGRATION.md`** - Full documentation

### Đã tích hợp vào My Profile:

✅ **Toggle UI** để chọn giữa Tusky và Walrus
✅ **Avatar upload** tự động sử dụng storage đã chọn
✅ **Profile update** với Tusky support

## ⚠️ Setup Required:

### Bước 1: Lấy API Key từ Tusky

1. Truy cập: https://app.tusky.io/account/api-keys
2. Đăng nhập và tạo API key mới
3. Copy API key

### Bước 2: Thêm API Key vào `.env.local`

```bash
NEXT_PUBLIC_TUSKY_API_KEY=your-tusky-api-key-here
```

### Bước 3: Restart dev server

```bash
npm run dev
```

## Cách sử dụng nhanh:

### 1. Upload ảnh cơ bản:

```typescript
import { uploadImageToTusky } from "@/utils/tuskyUpload";

const result = await uploadImageToTusky(file);
console.log(result.url); // Public URL
```

### 2. Upload ảnh riêng tư (có mã hóa):

```typescript
const result = await uploadImageToTusky(file, {
  isPrivate: true,
});
```

### 3. Sử dụng trong React Component:

```tsx
import { TuskyImageUploader } from "@/components/TuskyUploader";

export default function Page() {
  return <TuskyImageUploader />;
}
```

## Trong My Profile Page:

1. Mở `/my-profile`
2. Thấy toggle **🐘 Tusky** và **🦭 Walrus**
3. Chọn Tusky (mặc định)
4. Upload avatar → tự động lên Tusky

## API Key (Optional):

Thêm vào `.env.local`:

```bash
NEXT_PUBLIC_TUSKY_API_KEY=your-api-key-here
```

## Functions có sẵn:

- `uploadImageToTusky()` - Upload ảnh
- `getTuskyUrl()` - Lấy URL từ blob ID
- `uploadImageDataToTusky()` - Upload từ base64/URL
- `createPrivateVault()` - Tạo vault riêng tư
- `getUserAssets()` - List files
- `getUserVaults()` - List vaults
- `downloadFile()` - Download file

## Xem thêm:

📖 **Full documentation**: [TUSKY_INTEGRATION.md](./TUSKY_INTEGRATION.md)  
💡 **Examples**: [src/examples/tuskyExamples.ts](./src/examples/tuskyExamples.ts)  
🎨 **Components**: [src/components/TuskyUploader.tsx](./src/components/TuskyUploader.tsx)

## Test ngay:

```bash
npm run dev
# Mở http://localhost:3000/my-profile
# Connect wallet và thử upload avatar với Tusky!
```

---

**Tusky Features:**

- 🔒 End-to-end encryption
- 🌐 Decentralized storage (Walrus)
- 📦 1GB free storage
- 🔗 Magic links for sharing
- 🗄️ Private vaults
