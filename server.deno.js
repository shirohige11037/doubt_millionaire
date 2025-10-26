import { serveDir } from "jsr:@std/http/file-server";
//import { returnPlayedCardCount } from "./public/game/anim.js";

const kv = await Deno.openKv();

const userSockets = new Map();

async function deleteUser(userid, roomname) {
  const nowRoom = (await kv.get(["rooms", roomname])).value;
  for (let i = 0; i < nowRoom.length; i++) {
    if (nowRoom[i] === userid) {
      nowRoom.splice(i, 1);
      break;
    }
  }

  await kv.delete(["username", userid]);
  userSockets.delete([roomname, userid]);

  if (nowRoom.length < 1) {
    kv.delete(["rooms", roomname]);
  } else {
    kv.set(["rooms", roomname], nowRoom);
    for (let i = 0; i < nowRoom.length; i++) {
      const sendSocket = userSockets.get(
        "room:" + roomname + "id:" + nowRoom[i],
      );

      sendSocket.send(JSON.stringify({
        type: "changeMember",
        playerCount: nowRoom.length,
      }));
    }
  }
}

/**
 * APIリクエストを処理する
 */
Deno.serve(async (req) => {
  // URLのパスを取得
  const pathname = new URL(req.url).pathname;
  console.log(pathname);

  if (pathname === "/matchinguu") {
    return new Response("matching");
  }

  if (pathname === "/ws/game") {
    const params = new URL(req.url).searchParams;
    const roomname = params.get("room");
    const username = params.get("name");
    const userid = params.get("id");
    console.log(`room=${roomname},name=&${username},id=${userid}`);
    if (username === "" || userid === "" || roomname === "") {
      console.log("error401");
      return new Response("あなたは誰ですか？", { status: 401 });
    }

    if ((await kv.get(["username", userid])) !== username) {
      await kv.set(["username", userid], username);
    } else { //if ((await kv.get(["username", userid])) !== username)
      console.log("error402");
      return new Response("idと名前に関連がありません", { status: 402 });
    }

    const { socket, response } = Deno.upgradeWebSocket(req);
    socket.onopen = async () => {
      const rooms = await kv.get(["rooms", roomname]);
      let room = rooms.value;
      console.log(room);
      if (room === null) {
        room = [userid];
        await kv.set(["rooms", roomname], room);
      } else {
        if (Array.isArray(room)) {
          let bl = false;
          for (let i = 0; i < room.length && i < 5; i++) {
            if (room[i] === userid) bl = true;
          }
          if (!bl) room.push(userid);
        } else {
          room = [userid];
        }
        await kv.set(["rooms", roomname], room);
      }
      console.log(room);
      userSockets.set("room:" + roomname + "id:" + userid, socket);
      console.log(userSockets.get("room:" + roomname + "id:" + userid));

      socket.onclose = async () => {
        console.log("close:" + userid);
        await deleteUser(userid, roomname);
        socket.onclose = null;
        socket.onerror = null;
      };
      socket.onerror = async () => {
        console.log("error:" + userid);
        await deleteUser(userid, roomname);
        socket.onclose = null;
        socket.onerror = null;
      };
      console.log(room);

      for (let i = 0; i < room.length; i++) {
        const sendSocket = userSockets.get(
          "room:" + roomname + "id:" + userid,
        );

        console.log(sendSocket);
        sendSocket.send(JSON.stringify({
          type: "changeMember",
          playerCount: room.length,
        }));
      }
    };

    return response;
  }

  // publicフォルダ内にあるファイルを返す
  return serveDir(req, {
    fsRoot: "public",
    urlRoot: "",
    showDirListing: true,
    enableCors: true,
  });
});
