// src/main.js
var RetroMarbleGame = require('./src/game').default || require('./src/game');
var DataBus = require('./src/databus').default || require('./src/databus');

var databus = DataBus;

// 游戏实例
var game = null;

// 小游戏初始化
wx.onShow(function() {
  console.log('游戏启动');
  if (!game) {
    game = new RetroMarbleGame();
  }
});

wx.onHide(function() {
  console.log('游戏暂停');
  if (game) {
    // 可以在这里保存游戏状态
    game = null;
  }
});

// 导出一些全局方法供微信小游戏使用
wx.claimPoints = function() {
  if (game) {
    var success = game.claimPoints();
    if (success) {
      wx.showToast({
        title: '领取成功！获得' + databus.claimAmount + '积分',
        icon: 'success'
      });
    } else {
      var remainingTime = databus.getClaimCooldownRemaining();
      var seconds = Math.ceil(remainingTime / 1000);
      wx.showToast({
        title: '冷却时间未到，还需' + seconds + '秒',
        icon: 'none'
      });
    }
  }
};

wx.placeBet = function(amount) {
  if (game) {
    var success = game.placeBet(amount);
    if (success) {
      wx.showToast({
        title: '下注成功！投入' + amount + '积分',
        icon: 'success'
      });
    } else {
      wx.showToast({
        title: '下注失败，积分不足或未选择弹珠',
        icon: 'none'
      });
    }
  }
};

wx.togglePause = function() {
  if (game) {
    game.togglePause();
  }
};

// 游戏启动
game = new RetroMarbleGame();