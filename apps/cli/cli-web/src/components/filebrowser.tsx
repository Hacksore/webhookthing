import {
  DocumentPlusIcon,
  FolderIcon,
  FolderPlusIcon,
  HomeIcon,
  InformationCircleIcon,
  PlayIcon,
  PlusIcon,
} from "@heroicons/react/20/solid";
import { Fragment, useState } from "react";
import toast from "react-hot-toast";
import { Link } from "wouter";
import { Menu, Transition } from "@headlessui/react";
import { CliApiRouter } from "@captain/cli-core";
import { inferRouterOutputs } from "@trpc/server";

import { Tooltip } from "./common/tooltip";
import { WebhookFormModal } from "./webhook-form";
import { FolderFormModal } from "./folder-form-modal";

import { cliApi } from "../utils/api";
import { classNames } from "../utils/classnames";
import { useCurrentUrl } from "../utils/useCurrentUrl";
import { generatePrefillFromConfig } from "../utils/configTransforms";

const pathArrToUrl = (pathArr: string[], nav?: string) => {
  const url = nav ? `${pathArr.concat(nav).join("/")}` : `${pathArr.join("/")}`;

  // make sure we always have a leading slash
  if (!url.startsWith("/")) return `/${url}`;
  return url;
};

type DataResponse = inferRouterOutputs<CliApiRouter>["parseUrl"];
export type FolderDataType = Extract<DataResponse, { type: "folder" }>["data"];

export const FileBrowser = (input: { path: string; data: FolderDataType }) => {
  const { path, data } = input;

  const pathArr = path.split("/").slice(1);

  const { mutate: openFolder } = cliApi.openFolder.useMutation({
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const { mutate: runFile } = cliApi.runFile.useMutation({
    onSuccess: () => {
      toast.success(`Got response from server! Check console for details.`);
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const [selectedHookName, setSelectedHook] = useState<string>("");
  const [storedEndpoint] = useCurrentUrl();

  const selectedHook = data.files?.find((x) => x.name === selectedHookName);

  return (
    <div className="flex min-h-0 flex-col divide-y divide-gray-200 first-line:w-full">
      {/* breadcrumbs */}
      <nav
        className="flex items-center justify-between pb-4"
        aria-label="Breadcrumb"
      >
        <ol role="list" className="flex items-center space-x-4">
          <li className="flex-items-center">
            <Link
              href="/"
              className={classNames(
                "flex items-center text-gray-400",
                path.length > 0 ? "hover:text-indigo-600" : "cursor-default"
              )}
            >
              <HomeIcon className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
              <span className="sr-only">{`root`}</span>
            </Link>
          </li>
          {pathArr.map((page) => (
            <li key={page}>
              <div className="flex items-center">
                <svg
                  className="h-5 w-5 flex-shrink-0 text-gray-300"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                  aria-hidden="true"
                >
                  <path d="M5.555 17.776l8-16 .894.448-8 16-.894-.448z" />
                </svg>
                <Link
                  href={pathArrToUrl(
                    pathArr.slice(0, pathArr.indexOf(page) + 1)
                  )}
                  className="ml-4 text-sm font-medium text-gray-400 hover:text-indigo-600"
                  aria-current={page ? "page" : undefined}
                >
                  {page}
                </Link>
              </div>
            </li>
          ))}
        </ol>
        <div className="flex flex-row gap-1">
          <button
            className="flex items-center justify-center rounded-md border border-transparent border-gray-50 px-2 py-1 text-sm font-medium leading-4 text-gray-600 shadow-sm hover:bg-indigo-100/10 hover:text-indigo-600 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            onClick={() => openFolder({ path })}
          >
            {`Open Folder`}
          </button>
          <CreateMenu path={pathArr} />
        </div>
      </nav>
      {/* folders section */}
      <div className="py-2">
        <h3 className="text-lg font-medium leading-6 text-gray-900">
          {`Folders`}
        </h3>
        <div className="flex h-28 flex-row space-x-3 overflow-x-auto py-2">
          {data.folders.map((folder) => (
            <Tooltip key={folder} content={folder} placement="bottom">
              <Link href={pathArrToUrl(pathArr, folder)}>
                <div
                  key={folder}
                  className="flex w-1/5 flex-col items-center justify-center space-y-1 truncate rounded-md border border-gray-50 px-6 py-4 text-sm font-medium text-gray-600 shadow-sm hover:bg-indigo-100/10 hover:text-indigo-600 hover:shadow-md"
                >
                  <FolderIcon
                    className="h-5 w-5 flex-shrink-0"
                    aria-hidden="true"
                  />
                  <span className="w-full truncate">{folder}</span>
                </div>
              </Link>
            </Tooltip>
          ))}
        </div>
      </div>
      {/* files section */}
      <div className="flex min-h-0 grow flex-col py-2">
        {selectedHook && (
          <WebhookFormModal
            type="update"
            openState={[
              true,
              () => {
                setSelectedHook("");
              },
            ]}
            prefill={{
              ...selectedHook,
              config: generatePrefillFromConfig(selectedHook.config ?? {}),
            }}
            onClose={() => {
              setSelectedHook("");
            }}
            path={pathArr}
          />
        )}
        <h3 className="text-lg font-medium leading-6 text-gray-900">
          {`Files`}
        </h3>
        <div className="w-full overflow-y-auto">
          <ul role="list" className="flex flex-col space-y-3 py-2">
            {data.files.map((file) => (
              <li key={file.name} className="flex w-full flex-row gap-2">
                <Link href={pathArrToUrl(pathArr, file.name)}>
                  <div className="group flex grow flex-row items-start justify-between gap-2 overflow-hidden rounded-md border border-gray-50 px-6 py-2 font-medium text-gray-600 shadow-sm hover:bg-indigo-100/10 hover:text-indigo-600 hover:shadow-md">
                    {file.name}
                    {(file.config?.url || file.config?.headers) && (
                      <Tooltip
                        content="This hook has a custom config"
                        placement="left"
                      >
                        <InformationCircleIcon className="h-5 w-5 text-gray-600" />
                      </Tooltip>
                    )}
                  </div>
                </Link>
                <button
                  className="flex items-center justify-center rounded-md border border-transparent border-gray-50 px-3 text-sm font-medium leading-4 text-gray-600 shadow-sm hover:bg-indigo-100/10 hover:text-indigo-600 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                  onClick={() => {
                    runFile({
                      file: `${path}/${file.name}`,
                      url: storedEndpoint,
                    });
                  }}
                >
                  <PlayIcon className="h-4" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

const CreateMenu = ({ path }: { path: string[] }) => {
  const addHookModalState = useState(false);
  const addFolderModalState = useState(false);

  return (
    <>
      <FolderFormModal
        openState={addFolderModalState}
        type="create"
        path={path}
      />
      <WebhookFormModal
        type="create"
        openState={addHookModalState}
        path={path}
      />
      <Menu as="div" className="relative inline-block text-left">
        <div>
          <Menu.Button className="flex items-center justify-center rounded-md border border-transparent border-gray-50 px-2 py-1 text-sm font-medium leading-4 text-gray-600 shadow-sm hover:bg-indigo-100/10 hover:text-indigo-600 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2">
            <span className="sr-only">{`Open create menu`}</span>
            <PlusIcon className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
          </Menu.Button>
        </div>

        <Transition
          as={Fragment}
          enter="transition ease-out duration-100"
          enterFrom="transform opacity-0 scale-95"
          enterTo="transform opacity-100 scale-100"
          leave="transition ease-in duration-75"
          leaveFrom="transform opacity-100 scale-100"
          leaveTo="transform opacity-0 scale-95"
        >
          <Menu.Items className="absolute right-0 z-10 mt-2 w-36 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
            <div className="w-full py-1">
              <Menu.Item>
                {({ active }) => (
                  <div className="flex w-full flex-row items-center justify-start">
                    <button
                      className={classNames(
                        active
                          ? "bg-gray-100 text-indigo-700"
                          : "text-gray-700",
                        "flex w-full flex-row items-center justify-start gap-2 px-4 py-2 text-sm"
                      )}
                      onClick={() => {
                        addFolderModalState[1](true);
                      }}
                    >
                      <FolderPlusIcon className="h-4" aria-hidden="true" />
                      {`Create Folder`}
                    </button>
                  </div>
                )}
              </Menu.Item>
              <Menu.Item>
                {({ active }) => (
                  <div className="flex flex-row items-center justify-start">
                    <button
                      className={classNames(
                        active
                          ? "bg-gray-100 text-indigo-700"
                          : "text-gray-700",
                        "flex w-full flex-row items-center justify-start gap-2 px-4 py-2 text-sm"
                      )}
                      onClick={() => {
                        addHookModalState[1](true);
                      }}
                    >
                      <DocumentPlusIcon className="h-4" aria-hidden="true" />
                      {`Create Hook`}
                    </button>
                  </div>
                )}
              </Menu.Item>
            </div>
          </Menu.Items>
        </Transition>
      </Menu>
    </>
  );
};
