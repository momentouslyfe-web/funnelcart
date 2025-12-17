import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

let supabase: SupabaseClient | null = null;

if (supabaseUrl && supabaseServiceKey) {
  supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
} else {
  console.warn("Supabase Storage: Missing credentials - file uploads will not work");
}

const PRODUCT_FILES_BUCKET = "product-files";
const MEDIA_ASSETS_BUCKET = "media-assets";

export interface UploadResult {
  success: boolean;
  path?: string;
  publicUrl?: string;
  error?: string;
}

export interface SignedUrlResult {
  success: boolean;
  signedUrl?: string;
  error?: string;
}

async function ensureBucketExists(bucketName: string): Promise<boolean> {
  if (!supabase) return false;
  
  try {
    const { data: buckets } = await supabase.storage.listBuckets();
    const exists = buckets?.some((b) => b.name === bucketName);

    if (!exists) {
      const { error } = await supabase.storage.createBucket(bucketName, {
        public: false,
        fileSizeLimit: 100 * 1024 * 1024, // 100MB
      });
      if (error && !error.message.includes("already exists")) {
        console.error(`Failed to create bucket ${bucketName}:`, error);
        return false;
      }
    }
    return true;
  } catch (error) {
    console.error(`Error ensuring bucket ${bucketName} exists:`, error);
    return false;
  }
}

export async function uploadProductFile(
  sellerId: string,
  productId: string,
  file: Buffer,
  fileName: string,
  mimeType: string
): Promise<UploadResult> {
  if (!supabase) {
    return { success: false, error: "Supabase Storage not configured" };
  }

  const bucketReady = await ensureBucketExists(PRODUCT_FILES_BUCKET);
  if (!bucketReady) {
    return { success: false, error: "Failed to initialize storage bucket" };
  }

  const path = `${sellerId}/${productId}/${Date.now()}-${fileName}`;

  const { data, error } = await supabase.storage
    .from(PRODUCT_FILES_BUCKET)
    .upload(path, file, {
      contentType: mimeType,
      upsert: false,
    });

  if (error) {
    return { success: false, error: error.message };
  }

  return {
    success: true,
    path: data.path,
  };
}

export async function uploadMediaAsset(
  sellerId: string,
  file: Buffer,
  fileName: string,
  mimeType: string
): Promise<UploadResult> {
  if (!supabase) {
    return { success: false, error: "Supabase Storage not configured" };
  }

  const bucketReady = await ensureBucketExists(MEDIA_ASSETS_BUCKET);
  if (!bucketReady) {
    return { success: false, error: "Failed to initialize storage bucket" };
  }

  const path = `${sellerId}/${Date.now()}-${fileName}`;

  const { data, error } = await supabase.storage
    .from(MEDIA_ASSETS_BUCKET)
    .upload(path, file, {
      contentType: mimeType,
      upsert: false,
    });

  if (error) {
    return { success: false, error: error.message };
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(MEDIA_ASSETS_BUCKET).getPublicUrl(data.path);

  return {
    success: true,
    path: data.path,
    publicUrl,
  };
}

export async function getSignedDownloadUrl(
  bucket: string,
  path: string,
  expiresInSeconds: number = 3600
): Promise<SignedUrlResult> {
  if (!supabase) {
    return { success: false, error: "Supabase Storage not configured" };
  }

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresInSeconds);

  if (error) {
    return { success: false, error: error.message };
  }

  return {
    success: true,
    signedUrl: data.signedUrl,
  };
}

export async function getSecureProductDownloadUrl(
  filePath: string,
  expiresInSeconds: number = 3600
): Promise<SignedUrlResult> {
  return getSignedDownloadUrl(PRODUCT_FILES_BUCKET, filePath, expiresInSeconds);
}

export async function deleteFile(bucket: string, path: string): Promise<boolean> {
  if (!supabase) {
    return false;
  }

  const { error } = await supabase.storage.from(bucket).remove([path]);
  return !error;
}

export async function deleteProductFile(path: string): Promise<boolean> {
  return deleteFile(PRODUCT_FILES_BUCKET, path);
}

export async function deleteMediaAsset(path: string): Promise<boolean> {
  return deleteFile(MEDIA_ASSETS_BUCKET, path);
}

export { PRODUCT_FILES_BUCKET, MEDIA_ASSETS_BUCKET };
