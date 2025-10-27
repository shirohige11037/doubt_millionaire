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
  userSockets.delete("room:" + roomname + "id:" + userid);

  if (nowRoom.length < 1) {
    kv.delete(["rooms", roomname]);
  } else {
    kv.set(["rooms", roomname], nowRoom);
    for (let i = 0; i < nowRoom.length; i++) {
      if (userSockets.has("room:" + roomname + "id:" + nowRoom[i])) {
        const sendSocket = userSockets.get(
          "room:" + roomname + "id:" + nowRoom[i],
        );

        sendSocket.send(JSON.stringify({
          type: "changeMember",
          playerCount: nowRoom.length,
          members: nowRoom,
        }));
      } else console.log(userSockets);
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

  if (pathname === "/getid") {
    const params = new URL(req.url).searchParams;
    const username = params.get("name");
    let answer = username;
    for (let i = 0;; i++) {
      if ((await kv.get(["username", answer])).value === undefined) {
        await kv.set(["username", answer]);
        break;
      }
      answer = username + "-" + i.toString() + "-";
    }
    return new Response(answer);
  }

  if (pathname === "/ws/game") {
    const params = new URL(req.url).searchParams;
    const roomname = params.get("room");
    const username = params.get("name");
    const userid = params.get("id");
    console.log(`room=${roomname},name=${username},id=${userid}`);
    if (username === "" || userid === "" || roomname === "") {
      console.log("error401");
      return new Response("あなたは誰ですか？", { status: 401 });
    }

    if ((await kv.get(["username", userid])).value !== username) {
      await kv.set(["username", userid], username);
    } /*else if ((await kv.get(["username", userid])).value !== username){
      console.log("error402");
      return new Response("idと名前に関連がありません", { status: 402 });
    }*/

    const MAX_MEMBER = 6;

    if ((await kv.get(["rooms", roomname])).value?.length >= MAX_MEMBER) {
      console.log("error403");
      return new Response("部屋がいっぱいいっぱいです", { status: 403 });
    }

    const { socket, response } = Deno.upgradeWebSocket(req);
    socket.onopen = async () => {
      const rooms = await kv.get(["rooms", roomname]);
      let room = rooms.value;
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
      userSockets.set("room:" + roomname + "id:" + userid, socket);

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
      console.log(`open${room}`);

      for (let i = 0; i < room.length; i++) {
        if (userSockets.has("room:" + roomname + "id:" + room[i])) {
          const sendSocket = userSockets.get(
            "room:" + roomname + "id:" + room[i],
          );

          sendSocket.send(JSON.stringify({
            type: "changeMember",
            playerCount: room.length,
            members: room,
          }));
        } else console.log(userSockets);
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
