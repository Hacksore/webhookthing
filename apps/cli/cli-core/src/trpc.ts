import { JsonBlobs } from "./../../cli-web/src/components/jsonblobs";
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

const configValidator = z.object({
  url: z.string(),
  query: z.record(z.string()).optional(),
  headers: z.record(z.string()).optional(),
});

export type ConfigValidatorType = z.infer<typeof configValidator>;

export const t = initTRPC.create({
  transformer: superjson,
});
export const cliApiRouter = t.router({
  getBlobs: t.procedure.query(async () => {
    if (!fs.existsSync(HOOK_PATH)) {
      return [];
    }

    const hooks = await fsPromises.readdir(HOOK_PATH);

    const res = hooks
      .filter(
        (hookFile) =>
          hookFile.includes(".json") && !hookFile.includes(".config")
      )
      .map(async (hook) => {
        const content = await fsPromises.readFile(
          path.join(HOOK_PATH, hook),
          "utf-8"
        );

        return {
          name: hook,
          content: JSON.parse(content),
        };
      });

    return Promise.all(res);
  }),

  getHook: t.procedure
    .input(z.object({ name: z.string() }))
    .query(async ({ input }) => {
      const { name } = input;

      if (!fs.existsSync(path.join(HOOK_PATH, `${name}.json`))) {
        console.log(`\u001b[31m[ERROR] ${name}.json does not exist`);
      }

      const body = await fsPromises.readFile(
        path.join(HOOK_PATH, `${name}.json`),
        "utf-8"
      );

      let config;
      if (fs.existsSync(path.join(HOOK_PATH, `${name}.config.json`))) {
        config = await fsPromises.readFile(
          path.join(HOOK_PATH, `${name}.config.json`),
          "utf-8"
        );
      }

      return {
        name,
        body,
        config: config ? JSON.parse(config) : undefined,
      };
    }),

  openFolder: t.procedure
    .input(z.object({ path: z.string() }))
    .mutation(async ({ input }) => {
      await openInExplorer(path.join(HOOK_PATH, input.path));
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
      console.log(`[INFO] Reading file ${file}, and POST-ing to ${url}`);
      const data = await fsPromises.readFile(path.join(HOOK_PATH, file));
      const parsedJson = JSON.parse(data.toString());

      try {
        const fetchedResult = await fetch(url, {
          method: "POST",
          body: JSON.stringify(parsedJson),
        });

        console.log(
          `[INFO] Got response: \n\n${JSON.stringify(fetchedResult, null, 2)}`
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

        await fsPromises.writeFile(
          path.join(HOOK_PATH, `${name}.config.json`),
          JSON.stringify(config, null, 2)
        );
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
      const { name, body, config } = input;
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

      if (config?.url || config?.query || config?.headers) {
        console.log(`[INFO] Config specified, updating ${name}.config.json`);

        // create config file if it doesn't exist
        if (!fs.existsSync(path.join(HOOK_PATH, `${name}.config.json`))) {
          await fsPromises.writeFile(
            path.join(HOOK_PATH, `${name}.config.json`),
            JSON.stringify(config, null, 2)
          );
        } else {
          //update existing config file
          const existingConfig = await fsPromises.readFile(
            path.join(HOOK_PATH, `${name}.config.json`),
            "utf-8"
          );

          const parsedConfig = JSON.parse(existingConfig);

          const updatedConfig = {
            ...parsedConfig,
            ...config,
          };

          await fsPromises.writeFile(
            path.join(HOOK_PATH, `${name}.config.json`),
            JSON.stringify(updatedConfig, null, 2)
          );
        }
      }
    }),
});

// export type definition of API
export type CliApiRouter = typeof cliApiRouter;
