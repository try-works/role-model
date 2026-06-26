const http = require("node:http");

const port = Number(process.env.PORT ?? process.argv[2] ?? 45678);

const server = http.createServer((request, response) => {
  if (request.url === "/health" || request.url === "/health/liveliness") {
    response.statusCode = 200;
    response.end("ok");
    return;
  }

  if (request.url === "/v1/models") {
    response.setHeader("content-type", "application/json");
    response.end(
      JSON.stringify({
        object: "list",
        data: [{ id: "openai/gpt-4.1-mini-fast", object: "model", owned_by: "openai" }],
      }),
    );
    return;
  }

  if (request.url === "/v1/chat/completions") {
    let body = "";
    request.on("data", (chunk) => {
      body += chunk;
    });
    request.on("end", () => {
      const parsed = JSON.parse(body || "{}");
      if (parsed.stream) {
        response.writeHead(200, { "content-type": "text/event-stream; charset=utf-8" });
        response.write(
          'data: {"id":"chat-pi-role-model","object":"chat.completion.chunk","created":1,"model":"openai/gpt-4.1-mini-fast","choices":[{"index":0,"delta":{"role":"assistant","content":"PI_ROLE_MODEL_"},"finish_reason":null}]}\n\n',
        );
        setTimeout(() => {
          response.write(
            'data: {"id":"chat-pi-role-model","object":"chat.completion.chunk","created":1,"model":"openai/gpt-4.1-mini-fast","choices":[{"index":0,"delta":{"content":"E2E_OK"},"finish_reason":null}]}\n\n',
          );
          setTimeout(() => {
            response.end(
              'data: {"id":"chat-pi-role-model","object":"chat.completion.chunk","created":1,"model":"openai/gpt-4.1-mini-fast","choices":[{"index":0,"delta":{},"finish_reason":"stop"}],"usage":{"prompt_tokens":11,"completion_tokens":4,"total_tokens":15}}\n\n' +
                "data: [DONE]\n\n",
            );
          }, 10);
        }, 10);
        return;
      }

      response.setHeader("content-type", "application/json");
      response.end(
        JSON.stringify({
          id: "chat-pi-role-model",
          object: "chat.completion",
          model: "openai/gpt-4.1-mini-fast",
          choices: [
            {
              index: 0,
              message: { role: "assistant", content: "PI_ROLE_MODEL_E2E_OK" },
              finish_reason: "stop",
            },
          ],
          usage: { prompt_tokens: 11, completion_tokens: 4, total_tokens: 15 },
        }),
      );
    });
    return;
  }

  response.statusCode = 404;
  response.end("not found");
});

server.listen(port, "127.0.0.1");

const shutdown = () => server.close(() => process.exit(0));
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
