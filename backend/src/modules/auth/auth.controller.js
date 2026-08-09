import * as authService from "./auth.service.js";

export async function register(req, res, next) {
  try {
    const result = await authService.registerUser(req.body);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

export async function login(req, res, next) {
  try {
    const result = await authService.loginUser(req.body);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

export async function demoLogin(req, res, next) {
  try {
    const result = await authService.loginAsDemo();
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

export async function me(req, res, next) {
  try {
    const user = await authService.getUserById(req.userId);
    res.status(200).json({ user });
  } catch (err) {
    next(err);
  }
}

export async function deleteAccount(req, res, next) {
  try {
    await authService.deleteUserAccount(req.userId, req.body.password);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

export async function forgotPassword(req, res, next) {
  try {
    await authService.requestPasswordReset(req.body.email);
    // Same response whether or not the email is registered — see
    // requestPasswordReset for why.
    res.status(200).json({ message: "Se o e-mail existir, enviamos um link de redefinição" });
  } catch (err) {
    next(err);
  }
}

export async function resetPassword(req, res, next) {
  try {
    await authService.resetPassword(req.body.token, req.body.password);
    res.status(200).json({ message: "Senha redefinida com sucesso" });
  } catch (err) {
    next(err);
  }
}