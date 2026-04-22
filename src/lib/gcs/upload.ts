import { Storage } from "@google-cloud/storage";

function getStorage() {
  const privateKey = process.env.GCS_PRIVATE_KEY?.replace(/\\n/g, "\n");
  return new Storage({
    projectId: process.env.GCS_PROJECT_ID,
    credentials: {
      client_email: process.env.GCS_CLIENT_EMAIL,
      private_key: privateKey,
    },
  });
}

const BUCKET = () => process.env.GCS_BUCKET_NAME!;
const FOLDER = "images/books";

/**
 * Buffer를 GCS에 업로드하고 공개 URL 반환
 */
export async function uploadToGCS(
  buffer: Buffer,
  fileName: string,
  contentType = "image/png",
): Promise<string> {
  const storage = getStorage();
  const bucket = storage.bucket(BUCKET());
  const filePath = `${FOLDER}/${fileName}`;
  const file = bucket.file(filePath);

  await file.save(buffer, {
    metadata: { contentType },
    public: true,
  });

  return `https://storage.googleapis.com/${BUCKET()}/${filePath}`;
}

/**
 * 드래프트의 모든 슬라이드 이미지를 생성 후 GCS 업로드
 * 반환: 공개 URL 배열
 */
export async function uploadDraftSlides(
  draftId: string,
  slideUrls: string[],
  baseUrl: string,
): Promise<string[]> {
  const publicUrls: string[] = [];

  for (let i = 0; i < slideUrls.length; i++) {
    const slideUrl = slideUrls[i].startsWith("http")
      ? slideUrls[i]
      : `${baseUrl}${slideUrls[i]}`;

    const res = await fetch(slideUrl);
    if (!res.ok) throw new Error(`슬라이드 ${i + 1} 이미지 생성 실패`);

    const buffer = Buffer.from(await res.arrayBuffer());
    const fileName = `${draftId}/slide-${i + 1}.png`;
    const url = await uploadToGCS(buffer, fileName);
    publicUrls.push(url);
  }

  return publicUrls;
}
