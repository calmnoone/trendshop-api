function errorHandler(err, req, res, _next) {
  console.error(`[${new Date().toISOString()}]`, err);

  const status = err.status || 500;
  res.status(status).json({
    code: status,
    message: err.message || '服务器内部错误',
  });
}

module.exports = errorHandler;
