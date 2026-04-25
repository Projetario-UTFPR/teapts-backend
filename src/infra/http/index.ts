import { type Request, type Response } from "express";

// Making these aliases allow easier refactory or error search
// if switching to fastify at some point.
export type HttpRequest = Request;
export type HttpResponse = Response;
