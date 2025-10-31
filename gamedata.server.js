export class gamedata {
  rules;
  members;
  data;
  nowCard_looks;
  nowCard_truth;
  state;
  phase;
  lastPlayer;
  order;
  turn;
  winners;
  losers;

  constructor(rules, members) {
    this.rules = rules;
    this.members = members;

    this.winners = [];
    this.losers = [];

    this.data = {};
    for (let i = 0; i < this.members.length; i++) {
      this.data[this.members[i]] = this.setPlayerData();
    }

    this.state = {
      "jBack": false,
      "revol": false,
      "9Back": false,
    };

    this.phase = "throw";

    this.deckDist();

    this.order = [];
    for (let i = 0; i < this.members.length; i++) {
      this.order.push(members[i]);
    }
    for (let i = 0; i < this.order.length; i++) {
      const swapNum = Math.floor(Math.random() * this.order.length);
      const swap = this.order[i];
      this.order[i] = this.order[swapNum];
      this.order[swapNum] = swap;
    }

    this.turn = 0;
    this.lastPlayer = this.order[this.turn];
  }

  setPlayerData = () => {
    return {
      "life": 3,
      "deck": [],
    };
  };

  deckDist = () => {
    const cards = [];
    for (let i = 0; i < 4 * 13 + 2; i++) {
      cards.push({
        "data": i % 13 + 1,
        "suit": i / 4 + 1,
      });
    }

    for (let i = 0; i < cards.length; i++) {
      const swapNum = Math.floor(Math.random() * cards.length);
      const swap = cards[i];
      cards[i] = cards[swapNum];
      cards[swapNum] = swap;
    }

    for (let i = 0; i < cards.length; i++) {
      this.data[this.members[i % this.members.length]]["deck"].push(cards[i]);
    }
  };

  pass = () => {
    if (this.phase === "throw") {
      this.turn = (this.turn + 1) % this.turn.length;
      if (this.lastPlayer === this.order[this.turn]) {
        this.nowCard_looks = -1;
        this.nowCard_truth = -1;
      }
    }
  };

  doubt = (player) => {
    if (this.phase !== "doubt") return;
    if (this.lastPlayer === player) {
      this.pass();
      return;
    }
  };

  throw = (player, card_truth, card_looks) => {
    if (this.phase !== "throw") return false;
    if (this.order[this.turn] !== player) return false;
    for (let i = 0; i < decks[player].length; i++) {
      if (card_truth === decks[player][i]) {
        this.nowCard_truth = decks[player][i];
        this.nowCard_looks = card_looks;
        this.lastPlayer = this.order[this.turn];

        this.phase = "doubt";

        return true;
      }
    }
    return false;
  };
}
