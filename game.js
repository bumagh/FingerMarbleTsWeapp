// 添加类型引用
var canvas = wx.createCanvas();
var context = canvas.getContext('2d'); // 创建一个 2d context
if (!context) {
    throw new Error('Failed to get 2d context');
}
context.fillStyle = '#1aad19'; // 矩形颜色
context.fillRect(0, 0, 100, 100); // 矩形左上角顶点为(0, 0)，右下角顶点为(100, 100)
context.fillRect(canvas.width / 2 - 50, 0, 100, 100);
function drawRect (x, y) {
    context.clearRect(x, y - 1, 100, 100);
    context.fillRect(x, y, 100, 100);
}
drawRect(canvas.width / 2 - 50, 0);
