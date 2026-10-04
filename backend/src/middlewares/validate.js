function validate(schema) {
  return (req, res, next) => {
    // No Express 5, sem corpo JSON req.body é undefined; tratando como {},
    // o Zod aponta cada campo obrigatório que faltou.
    req.body = schema.parse(req.body ?? {});
    next();
  };
}

module.exports = validate;
