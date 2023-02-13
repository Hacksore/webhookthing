import { initTRPC } from "@trpc/server";
import superjson from "superjson";
import { z } from "zod";
import fetch from "node-fetch";
import fsPromises from "fs/promises";
import fs from "fs";
import path from "path";

import { openInExplorer } from "./open-folder";
import { getSampleHooks } from "./get-sample-hooks";
import { HOOK_PATH } from "./constants";
import { configValidator, updateConfig } from "./update-config";
import { substituteTemplate } from "./templateSubstitution";

export type { ConfigValidatorType } from "./update-config";

export const t = initTRPC.create({
  transformer: superjson,
});
export const cliApiRouter = t.router({
  getBlobs: t.procedure.query(async () => {
    if (!fs.existsSync(HOOK_PATH)) {
      // TODO: this should probably be an error, and the frontend should handle it
      return [];
    }

    const hooks = await fsPromises.readdir(HOOK_PATH);

    const res = hooks
      .filter(
        (hookFile) =>
          hookFile.includes(".json") && !hookFile.includes(".config.json")
      )
      .map(async (hook) => {
        const bodyPromise = fsPromises.readFile(
          path.join(HOOK_PATH, hook),
          "utf-8"
        );

        const configPath = hook.replace(".json", "") + ".config.json";

        let config;
        if (fs.existsSync(path.join(HOOK_PATH, configPath))) {
          config = await fsPromises.readFile(
            path.join(HOOK_PATH, configPath),
            "utf-8"
          );
        }

        return {
          name: hook,
          body: await bodyPromise,
          config: config ? JSON.parse(config) : undefined,
        };
      });

    return Promise.all(res);
  }),

  openFolder: t.procedure
    .input(z.object({ path: z.string() }))
    .mutation(async ({ input }) => {
      // if running in codespace, early return
      // eslint-disable-next-line turbo/no-undeclared-env-vars
      if (process.env.CODESPACES) {
        throw new Error(
          "Sorry, opening folders in codespaces is not supported yet."
        );
      }
      // if running over ssh, early return
      if (
        // eslint-disable-next-line turbo/no-undeclared-env-vars
        process.env.SSH_CONNECTION ||
        // eslint-disable-next-line turbo/no-undeclared-env-vars
        process.env.SSH_CLIENT ||
        // eslint-disable-next-line turbo/no-undeclared-env-vars
        process.env.SSH_TTY
      ) {
        throw new Error(
          "Sorry, opening folders on remote connections is not supported yet."
        );
      }

      try {
        await openInExplorer(path.join(HOOK_PATH, input.path));
      } catch (e) {
        console.log(
          "[ERROR] Failed to open folder (unless you're on Windows, then this just happens)",
          e
        );
      }
    }),

  getSampleHooks: t.procedure.mutation(async () => {
    await getSampleHooks();
  }),

  runFile: t.procedure
    .input(
      z.object({
        file: z.string(),
        url: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const { file, url } = input;
      let hasCustomConfig = false;
      console.log(`[INFO] Reading file ${file}`);

      let config = {
        url,
        query: undefined,
        headers: undefined,
        method: "POST",
      } as {
        url: string;
        query?: Record<string, string>;
        headers?: Record<string, string>;
        method: "POST" | "GET" | "PUT" | "DELETE" | "PATCH";
      };

      if (
        fs.existsSync(path.join(HOOK_PATH, file.split(".")[0] + ".config.json"))
      ) {
        hasCustomConfig = true;
        console.log(
          `[INFO] Found ${file.split(".")[0]}.config.json, reading it`
        );
        const configFileContents = await fsPromises.readFile(
          path.join(HOOK_PATH, file.split(".")[0] + ".config.json")
        );
        config = { ...config, ...JSON.parse(configFileContents.toString()) };

        // template substitution for header values
        if (config.headers) {
          config.headers = Object.fromEntries(
            Object.entries(config.headers).map(([key, value]) => {
              return [key, substituteTemplate({ template: value })];
            })
          );
        }
      }
      const data = await fsPromises.readFile(path.join(HOOK_PATH, file));
      const parsedJson = JSON.parse(data.toString());

      try {
        console.log(
          `[INFO] Sending to ${config.url} ${
            hasCustomConfig
              ? `with custom config from ${file.split(".")[0]}.config.json`
              : ""
          }\n`
        );

        const fetchedResult = await fetch(config.url, {
          method: config.method,
          headers: config.headers,
          body:
            config.method !== "GET" ? JSON.stringify(parsedJson) : undefined,
        }).then((res) => res.json());

        console.log(
          `[INFO] Got response: \n\n${JSON.stringify(fetchedResult, null, 2)}\n`
        );
        return fetchedResult;
      } catch (e) {
        console.log("\u001b[31m[ERROR] FAILED TO SEND");
        if ((e as any).code === "ECONNREFUSED") {
          console.log(
            "\u001b[31m[ERROR] Connection refused. Is the server running?"
          );
        } else {
          console.log("\u001b[31m[ERROR] Unknown error", e);
        }
        throw new Error("Connection refused. Is the server running?");
      }
    }),

  createHook: t.procedure
    .input(
      z.object({
        name: z.string(),
        body: z.string(),
        config: configValidator.optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { name, body, config } = input;
      console.log(`[INFO] Creating ${name}.json`);

      await fsPromises.writeFile(path.join(HOOK_PATH, `${name}.json`), body);
      if (config?.url || config?.query || config?.headers) {
        console.log(`[INFO] Config specified, creating ${name}.config.json`);
        updateConfig({ name, config });
      }
    }),

  updateHook: t.procedure
    .input(
      z.object({
        name: z.string(),
        body: z.string(),
        config: configValidator.optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { body, config } = input;
      const name = input.name.split(".json")[0];

      if (!name) throw new Error("No name");

      console.log(`[INFO] updating ${name}.json`);

      const existingBody = await fsPromises.readFile(
        path.join(HOOK_PATH, `${name}.json`),
        "utf-8"
      );

      const parsedBody = JSON.parse(existingBody);

      const updatedBody = {
        ...parsedBody,
        ...JSON.parse(body),
      };

      await fsPromises.writeFile(
        path.join(HOOK_PATH, `${name}.json`),
        JSON.stringify(updatedBody, null, 2)
      );

      if (
        config?.url ||
        config?.query ||
        config?.headers ||
        fs.existsSync(path.join(HOOK_PATH, `${name}.config.json`))
      ) {
        console.log(`[INFO] Config specified, updating ${name}.config.json`);
        updateConfig({ name, config });
      }
    }),
});

// export type definition of API
export type CliApiRouter = typeof cliApiRouter;
