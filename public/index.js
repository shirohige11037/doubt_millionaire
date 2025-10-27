document.getElementById("toMatching").addEventListener("click", async () => {
  try {
    // 入力値を取得
    const name = document.getElementById("nameText").value.trim();
    const room = document.getElementById("roomText").value.trim();

    if (!name || !room) {
      alert("名前とルーム名を入力してください");
      return;
    }

    console.log("idを取得");
    // IDを取得
    const idResponse = await fetch(
      `/getid?name=${encodeURIComponent(name)}&room=${
        encodeURIComponent(room)
      }`,
    );
    console.log("取得したIDを確認");
    const id = await idResponse.text();

    console.log("取得したID:", id);

    // マッチングリクエストを送信
    await fetch(
      `/matching?name=${encodeURIComponent(name)}&room=${
        encodeURIComponent(room)
      }&id=${encodeURIComponent(id)}`,
    );

    // マッチングページに移動
    window.location.href = `/matching?name=${encodeURIComponent(name)}&room=${
      encodeURIComponent(room)
    }&id=${encodeURIComponent(id)}`;
  } catch (error) {
    console.error("エラー:", error);
    alert("通信中にエラーが発生しました");
  }
});
