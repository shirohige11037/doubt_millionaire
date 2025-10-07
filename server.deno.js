import { serveDir } from "jsr:@std/http/file-server"

/**
 * APIリクエストを処理する
 */
Deno.serve((req) => {
  // URLのパスを取得
  const pathname = new URL(req.url).pathname;
  console.log(pathname);
  // パスが'/welcome-message'だったら「'test'」の文字を返す
  if (req.method === "GET" && pathname === "/welcome-message") {
    return new Response("test");
  }

  // publicフォルダ内にあるファイルを返す
  return serveDir(req, {
    fsRoot: "public",
    urlRoot: "",
    showDirListing: true,
    enableCors: true,
  });
});
