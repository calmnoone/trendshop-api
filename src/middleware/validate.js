function validate(validations) {
  return (req, res, next) => {
    const errors = [];
    for (const { field, type, required, message, min, max, pattern } of validations) {
      const value = req.body[field];

      if (required && (value === undefined || value === null || value === '')) {
        errors.push(message || `${field}不能为空`);
        continue;
      }

      if (value === undefined || value === null || value === '') continue;

      if (type === 'string' && typeof value !== 'string') {
        errors.push(`${field}必须是字符串`);
      }
      if (type === 'number' && typeof value !== 'number') {
        errors.push(`${field}必须是数字`);
      }
      if (type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        errors.push(`${field}格式不正确`);
      }
      if (min !== undefined && value.length < min) {
        errors.push(`${field}长度不能小于${min}`);
      }
      if (max !== undefined && value.length > max) {
        errors.push(`${field}长度不能大于${max}`);
      }
      if (pattern && !pattern.test(value)) {
        errors.push(message || `${field}格式不正确`);
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({ code: 400, message: errors[0] });
    }
    next();
  };
}

module.exports = validate;
