import { App } from "obsidian";
import ObsidianGit from "../main";
import {
    BranchInfo,
    DiffFile,
    FileStatusResult,
    LogEntry,
    Status,
    TreeItem,
    UnstagedFile,
} from "../types";

import { Configuration as OpenAIConfiguration, OpenAIApi } from "openai";

export abstract class GitManager {
    readonly plugin: ObsidianGit;
    readonly app: App;
    constructor(plugin: ObsidianGit) {
        this.plugin = plugin;
        this.app = plugin.app;
    }

    abstract status(): Promise<Status>;

    abstract commitAll(_: {
        message: string;
        status?: Status;
        unstagedFiles?: UnstagedFile[];
    }): Promise<number | undefined>;

    abstract commit(message?: string): Promise<number | undefined>;

    abstract stageAll(_: { dir?: string; status?: Status }): Promise<void>;

    abstract unstageAll(_: { dir?: string; status?: Status }): Promise<void>;

    abstract stage(filepath: string, relativeToVault: boolean): Promise<void>;

    abstract unstage(filepath: string, relativeToVault: boolean): Promise<void>;

    abstract discard(filepath: string): Promise<void>;

    abstract discardAll(_: { dir?: string; status?: Status }): Promise<void>;

    abstract pull(): Promise<FileStatusResult[] | undefined>;

    abstract push(): Promise<number>;

    abstract getUnpushedCommits(): Promise<number>;

    abstract canPush(): Promise<boolean>;

    abstract checkRequirements(): Promise<
        "valid" | "missing-repo" | "missing-git"
    >;

    abstract branchInfo(): Promise<BranchInfo>;

    abstract checkout(branch: string, remote?: string): Promise<void>;

    abstract createBranch(branch: string): Promise<void>;

    abstract deleteBranch(branch: string, force: boolean): Promise<void>;

    abstract branchIsMerged(branch: string): Promise<boolean>;

    abstract init(): Promise<void>;

    abstract clone(url: string, dir: string, depth?: number): Promise<void>;

    abstract setConfig(
        path: string,
        value: string | number | boolean | undefined
    ): Promise<void>;

    abstract getConfig(path: string): Promise<any>;

    abstract fetch(remote?: string): Promise<void>;

    abstract setRemote(name: string, url: string): Promise<void>;

    abstract getRemotes(): Promise<string[]>;

    abstract getRemoteUrl(remote: string): Promise<string | undefined>;

    abstract log(
        file: string | undefined,
        relativeToVault?: boolean,
        limit?: number
    ): Promise<LogEntry[]>;

    abstract getRemoteBranches(remote: string): Promise<string[]>;

    abstract removeRemote(remoteName: string): Promise<void>;

    abstract updateUpstreamBranch(remoteBranch: string): Promise<void>;

    abstract updateGitPath(gitPath: string): void;

    abstract updateBasePath(basePath: string): void;

    abstract getDiffString(
        filePath: string,
        stagedChanges: boolean,
        hash?: string
    ): Promise<string>;

    abstract getLastCommitTime(): Promise<Date | undefined>;

    getVaultPath(path: string): string {
        if (this.plugin.settings.basePath) {
            return this.plugin.settings.basePath + "/" + path;
        } else {
            return path;
        }
    }

    asRepositoryRelativePath(path: string, relativeToVault: boolean): string {
        return relativeToVault && this.plugin.settings.basePath.length > 0
            ? path.substring(this.plugin.settings.basePath.length + 1)
            : path;
    }

    private _getTreeStructure<T = DiffFile | FileStatusResult>(
        children: (T & { path: string })[],
        beginLength = 0
    ): TreeItem<T>[] {
        const list: TreeItem<T>[] = [];
        children = [...children];
        while (children.length > 0) {
            const first = children.first()!;
            const restPath = first.path.substring(beginLength);
            if (restPath.contains("/")) {
                const title = restPath.substring(0, restPath.indexOf("/"));
                const childrenWithSameTitle = children.filter((item) => {
                    return item.path
                        .substring(beginLength)
                        .startsWith(title + "/");
                });
                childrenWithSameTitle.forEach((item) => children.remove(item));
                const path = first.path.substring(
                    0,
                    restPath.indexOf("/") + beginLength
                );
                list.push({
                    title: title,
                    path: path,
                    vaultPath: this.getVaultPath(path),
                    children: this._getTreeStructure(
                        childrenWithSameTitle,
                        (beginLength > 0
                            ? beginLength + title.length
                            : title.length) + 1
                    ),
                });
            } else {
                list.push({
                    title: restPath,
                    data: first,
                    path: first.path,
                    vaultPath: this.getVaultPath(first.path),
                });
                children.remove(first);
            }
        }
        return list;
    }

    /*
     * Sorts the children and simplifies the title
     * If a node only contains another subdirectory, that subdirectory is moved up one level and integrated into the parent node
     */
    private simplify<T>(tree: TreeItem<T>[]): TreeItem<T>[] {
        for (const node of tree) {
            while (true) {
                const singleChild = node.children?.length == 1;
                const singleChildIsDir =
                    node.children?.first()?.data == undefined;

                if (
                    !(
                        node.children != undefined &&
                        singleChild &&
                        singleChildIsDir
                    )
                )
                    break;
                const child = node.children.first()!;
                node.title += "/" + child.title;
                node.data = child.data;
                node.path = child.path;
                node.vaultPath = child.vaultPath;
                node.children = child.children;
            }
            if (node.children != undefined) {
                this.simplify<T>(node.children);
            }
            node.children?.sort((a, b) => {
                const dirCompare =
                    (b.data == undefined ? 1 : 0) -
                    (a.data == undefined ? 1 : 0);
                if (dirCompare != 0) {
                    return dirCompare;
                } else {
                    return a.title.localeCompare(b.title);
                }
            });
        }
        return tree.sort((a, b) => {
            const dirCompare =
                (b.data == undefined ? 1 : 0) - (a.data == undefined ? 1 : 0);
            if (dirCompare != 0) {
                return dirCompare;
            } else {
                return a.title.localeCompare(b.title);
            }
        });
    }

    getTreeStructure<T = DiffFile | FileStatusResult>(
        children: (T & { path: string })[]
    ): TreeItem<T>[] {
        const tree = this._getTreeStructure<T>(children);

        const res = this.simplify<T>(tree);
        return res;
    }

    async getChangeSummary(
        status: FileStatusResult,
        diff: string
    ): Promise<string> {
        const prompts: Record<string, string> = {
            A: 'Using the provided git diff of one of my markdown-formatted Obsidian notes that has been changed, I need you to produce a concise and specific summary with a maximum of 1-2 short sentences of the changes to the file. The summary should state the core themes, actions, and details within the content. The summary should state what was changed in which section, followed by "in `filename`". The filename needs to be surrounded by backticks. The summary should offer direct insight into the content of the file, rather than a generic description. Don\'t mention if no changes were made. If there is no content in the diff, just state the file name, path, format, and say that the file was added.',
            M: 'Using the provided git diff of one of my markdown-formatted Obsidian notes that has been added, I need you to produce a concise and specific summary with a maximum of 1-2 short sentences of the added file. The summary should state the core themes, actions, and details within the content. The filename should be surrounded with backticks and formatted in the following manner: "Added `filename` with" followed by the summary. The filename needs to be surrounded by backticks. The summary should offer direct insight into the content of the file, rather than a generic description. ',
            D: 'Using the provided git diff of one of my markdown-formatted Obsidian notes that has been deleted, I need you to produce a concise and specific summary with a maximum of 1-2 short sentences of what was in the file. The summary should state the core themes, actions, and details within the content. The filename is surrounded with backticks and formatted in the following manner: "Deleted `filename` which contained" followed by the summary. The filename needs to be surrounded by backticks. The summary should offer direct insight into the content of the deleted file, rather than a generic description.',
        };

        let statusDesc;

        if (status.index === "R") {
            statusDesc = `Renamed \`${status.from}\` to \`${status.path}\``;
        } else if (prompts.hasOwnProperty(status.index)) {
            const conf = new OpenAIConfiguration({
                apiKey: this.plugin.settings.openaiApiKey,
            });
            const openai = new OpenAIApi(conf);
            try {
                const completionResponse = await openai.createChatCompletion({
                    model: "gpt-3.5-turbo",
                    messages: [
                        {
                            role: "user",
                            content: prompts[status.index] + "\n\n" + diff,
                        },
                    ],
                    temperature: 0.5,
                    max_tokens: 150,
                });
                statusDesc =
                    completionResponse?.data?.choices?.[0]?.message?.content?.trim();
            } catch (e) {
                console.error("Error generating prompt description: ", e);
            }
        }

        return statusDesc
            ? `- ${statusDesc}`
            : `${status.index} ${status.path}`;
    }

    async formatCommitMessage(template: string): Promise<string> {
        let status: Status | undefined;
        if (template.includes("{{numFiles}}")) {
            status = await this.status();
            const numFiles = status.staged.length;
            template = template.replace("{{numFiles}}", String(numFiles));
        }
        if (template.includes("{{hostname}}")) {
            const hostname = this.plugin.localStorage.getHostname() || "";
            template = template.replace("{{hostname}}", hostname);
        }

        if (template.includes("{{files}}")) {
            status = status ?? (await this.status());

            const changeset: { [key: string]: string[] } = {};
            status.staged.forEach((value: FileStatusResult) => {
                if (value.index in changeset) {
                    changeset[value.index].push(value.path);
                } else {
                    changeset[value.index] = [value.path];
                }
            });

            const chunks = [];
            for (const [action, files] of Object.entries(changeset)) {
                chunks.push(action + " " + files.join(" "));
            }

            const files = chunks.join(", ");

            template = template.replace("{{files}}", files);
        }

        if (template.includes("{{changeSummaries}}")) {
            const statusVal = status ?? (await this.status());
            const changeSummaryPromises = statusVal.staged
                .filter(
                    (status) => !status.path.startsWith(app.vault.configDir)
                )
                .map(async (e) => {
                    const diff = await this.getDiffString(e.path, true);
                    return await this.getChangeSummary(e, diff);
                });
            const changeSummaries = await Promise.all(changeSummaryPromises);
            template = template.replace(
                "{{changeSummaries}}",
                changeSummaries.join("\n\n")
            );
        }

        const moment = (window as any).moment;
        template = template.replace(
            "{{date}}",
            moment().format(this.plugin.settings.commitDateFormat)
        );
        if (this.plugin.settings.listChangedFilesInMessageBody) {
            template =
                template +
                "\n\n" +
                "Affected files:" +
                "\n" +
                (status ?? (await this.status())).staged
                    .map((e) => e.path)
                    .join("\n");
        }
        return template;
    }
}
