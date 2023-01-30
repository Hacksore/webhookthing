import {
  ArrowPathIcon,
  CloudArrowDownIcon,
  DocumentDuplicateIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  EyeSlashIcon,
  PlayIcon,
  PlusIcon,
  XMarkIcon,
} from "@heroicons/react/20/solid";
import { useState } from "react";
import { toast } from "react-hot-toast";

import { cliApi } from "../utils/api";
import { useCurrentUrl } from "../utils/useCurrentUrl";
import { Modal } from "./common/modal";

const HOOKS_FOLDER = ".thing/hooks";

export const JsonBlobs = () => {
  const { data, refetch: refetchBlobs } = cliApi.getBlobs.useQuery();

  const { mutate: runFile } = cliApi.runFile.useMutation({
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const { mutate: openFolder } = cliApi.openFolder.useMutation({
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const { mutate: getSampleHooks, isLoading } =
    cliApi.getSampleHooks.useMutation({
      onSuccess: () => {
        setTimeout(() => refetchBlobs(), 150);
      },
      onError: (err) => {
        toast.error(err.message);
      },
    });

  const [expanded, setExpanded] = useState<number[]>([]);

  const [storedEndpoint] = useCurrentUrl();

  const addModalState = useState(false);

  return (
    <>
      <Modal openState={addModalState}>
        <div className="relative transform overflow-hidden rounded-lg bg-white px-4 pt-5 pb-4 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
          <div className="absolute top-0 right-0 hidden pt-4 pr-4 sm:block">
            <button
              type="button"
              className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              onClick={() => addModalState[1](false)}
            >
              <span className="sr-only">Close</span>
              <XMarkIcon className="h-6 w-6" aria-hidden="true" />
            </button>
          </div>
          <div className="sm:flex sm:items-start">
            <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-indigo-100 sm:mx-0 sm:h-10 sm:w-10">
              <PlusIcon
                className="h-6 w-6 text-indigo-600"
                aria-hidden="true"
              />
            </div>
            <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
              <h3 className="text-lg font-medium leading-6 text-gray-900">
                Add a new webhook
              </h3>
              <div className="mt-2">
                <p className="text-sm text-gray-500">
                  Use the form below to specify the details of your webhook. You
                  can also drag a properly formatted JSON file into the window
                  to fill out the form.{" "}
                  <a href="#" className="text-indigo-600 hover:text-indigo-500">
                    Download Sample JSON
                  </a>
                </p>
              </div>
              <AddWebhookForm />
            </div>
          </div>
          <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
            <button
              type="button"
              className="inline-flex w-full justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:ml-3 sm:w-auto sm:text-sm"
              onClick={() => addModalState[1](false)}
            >
              Create
            </button>
            <button
              type="button"
              className="mt-3 inline-flex w-full justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-base font-medium text-gray-700 shadow-sm hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:mt-0 sm:w-auto sm:text-sm"
              onClick={() => addModalState[1](false)}
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>

      <div className="flex flex-col gap-2 pt-4">
        <div className="flex flex-row items-center justify-between">
          <div>
            <h3 className="text-lg font-medium leading-6 text-gray-900">
              Your Webhooks
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {`(put json files in ${HOOKS_FOLDER})`}
            </p>
          </div>
          <div className="flex flex-row items-center gap-2">
            <button
              className="flex items-center justify-center rounded-md border border-transparent bg-indigo-600 px-3 py-2 text-sm font-medium leading-4 text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              onClick={() => openFolder({ path: "" })}
            >
              Open Hooks Folder
            </button>
            <button
              className="flex items-center justify-center rounded-md border border-transparent bg-indigo-600 px-3 py-2 text-sm font-medium leading-4 text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              onClick={() => addModalState[1](true)}
            >
              <PlusIcon className="h-4 w-4" />
            </button>
          </div>
        </div>

        {data?.length ? (
          <ul role="list" className="space-y-3">
            {data.map((blob, i) => (
              <li
                key={blob.name}
                className="group flex flex-col items-start justify-between gap-2 overflow-hidden rounded-md bg-white px-6 py-4 shadow"
              >
                <div className="flex w-full flex-row items-center justify-between">
                  <div className="text-xl">{blob.name}</div>
                  <div className=" flex flex-row items-center gap-x-4 ">
                    <button
                      className="invisible group-hover:visible"
                      onClick={() => {
                        setExpanded((prev) =>
                          prev.includes(i)
                            ? prev.filter((x) => x !== i)
                            : [...prev, i]
                        );
                      }}
                    >
                      {expanded.includes(i) ? (
                        <EyeSlashIcon className="h-4" />
                      ) : (
                        <EyeIcon className="h-4" />
                      )}
                    </button>
                    <button
                      onClick={() => {
                        runFile({ file: blob.name, url: storedEndpoint });
                      }}
                    >
                      <PlayIcon className="h-4" />
                    </button>
                  </div>
                </div>
                {expanded.includes(i) && (
                  <pre className="max-h-96 w-full overflow-auto rounded-md bg-gray-200 p-4">
                    <code>{JSON.stringify(blob.content, null, 2)}</code>
                  </pre>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <div className="bg-white-50 rounded-md p-6 text-center shadow-lg">
            <DocumentDuplicateIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              No Webhooks
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {`Get started with our sample webhooks by clicking the button below,
            or add your own payloads to the ${HOOKS_FOLDER} folder.`}
            </p>
            <div className="mt-6">
              {isLoading ? (
                <ArrowPathIcon className="inline-flex h-5 w-5 animate-spin items-center justify-center text-gray-600" />
              ) : (
                <button
                  type="button"
                  className="inline-flex items-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                  onClick={() => getSampleHooks()}
                >
                  <CloudArrowDownIcon
                    className="-ml-1 mr-2 h-5 w-5"
                    aria-hidden="true"
                  />
                  Download Sample Webhooks
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
};

const AddWebhookForm = () => {
  return (
    <div className="mt-4 flex flex-col gap-2">
      <div id="name-input">
        <label
          htmlFor="name"
          className="block text-sm font-medium text-gray-700"
        >
          Name
        </label>
        <div className="mt-1">
          <input
            type="text"
            name="name"
            id="name"
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            placeholder="My Webhook"
          />
        </div>
      </div>
      <div id="url-input">
        <label
          htmlFor="url"
          className="block text-sm font-medium text-gray-700"
        >
          Endpoint URL
        </label>
        <div className="mt-1">
          <input
            type="text"
            name="url"
            id="url"
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            placeholder="https://example.com/webhook"
          />
        </div>
      </div>
      <div id="headers-input">
        <fieldset>
          <legend className="block text-sm font-medium text-gray-700">
            Headers
          </legend>
          <div className="mt-1 -space-y-px rounded-md bg-white shadow-sm">
            <div className="flex -space-x-px">
              <div className="w-1/2 min-w-0 flex-1">
                <label htmlFor="headerkey" className="sr-only">
                  Header Key
                </label>
                <input
                  type="text"
                  name="headerkey"
                  id="headerkey"
                  className="relative block w-full rounded-none rounded-tl-md border-gray-300 bg-transparent focus:z-10 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  placeholder="x-My-Header"
                />
              </div>
              <div className="min-w-0 flex-1">
                <label htmlFor="header-value" className="sr-only">
                  Header Value
                </label>
                <input
                  type="text"
                  name="header-value"
                  id="header-value"
                  className="relative block w-full rounded-none rounded-tr-md border-gray-300 bg-transparent focus:z-10 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  placeholder="Bearer 1234567890"
                />
              </div>
            </div>
            <div>
              <button
                type="button"
                className="flex w-full flex-row items-center gap-1 rounded-b-md border border-gray-300 bg-white px-4 py-2 text-start text-sm font-medium text-gray-700 hover:bg-gray-50 focus:z-10 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <PlusIcon className="h-4 w-4" />
                <span>Add a Header</span>
              </button>
            </div>
          </div>
        </fieldset>
      </div>
      <div id="body-input">
        <label
          htmlFor="body"
          className="block text-sm font-medium text-gray-700"
        >
          Body
        </label>
        <div className="mt-1">
          <textarea
            id="body"
            name="body"
            rows={3}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            placeholder="{}"
            defaultValue={""}
          />
        </div>
      </div>
    </div>
  );
};
