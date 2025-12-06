import RetroMarbleGame from './src/game';

var game = null;

// 小游戏初始化
wx.onShow(function () {
  console.log('游戏启动');
  if (!game) {
    game = new RetroMarbleGame();
  }
});

wx.onHide(function () {
  console.log('游戏暂停');
  if (game) {
    game.destroy();
    game = null;
  }
});

// 游戏启动
game = new RetroMarbleGame();