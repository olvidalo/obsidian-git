import { Platform } from "obsidian";
import { ObsidianGitSettings } from "./types";
export const DATE_FORMAT = "YYYY-MM-DD";
export const DATE_TIME_FORMAT_MINUTES = `${DATE_FORMAT} HH:mm`;
export const DATE_TIME_FORMAT_SECONDS = `${DATE_FORMAT} HH:mm:ss`;

export const GIT_LINE_AUTHORING_MOVEMENT_DETECTION_MINIMAL_LENGTH = 40;

export const DEFAULT_SETTINGS: Omit<ObsidianGitSettings, "autoCommitMessage"> =
    {
        commitMessage: "vault backup: {{date}}",
        commitDateFormat: DATE_TIME_FORMAT_SECONDS,
        autoSaveInterval: 0,
        autoPushInterval: 0,
        autoPullInterval: 0,
        autoPullOnBoot: false,
        disablePush: false,
        pullBeforePush: true,
        disablePopups: false,
        listChangedFilesInMessageBody: false,
        showStatusBar: true,
        updateSubmodules: false,
        syncMethod: "merge",
        customMessageOnAutoBackup: false,
        autoBackupAfterFileChange: false,
        treeStructure: false,
        refreshSourceControl: Platform.isDesktopApp,
        basePath: "",
        differentIntervalCommitAndPush: false,
        changedFilesInStatusBar: false,
        showedMobileNotice: false,
        refreshSourceControlTimer: 7000,
        showBranchStatusBar: true,
        setLastSaveToLastCommit: false,
        submoduleRecurseCheckout: false,
        gitDir: "",
        showFileMenu: true,
        openaiApiKey: "",
        openaiModel: "gpt-3.5-turbo",
        modifiedPrompt:
            'Using the provided git diff of one of my markdown-formatted Obsidian notes that has been changed, I need you to produce a concise and specific summary with a maximum of 1-2 short sentences of the changes to the file. The summary should state the core themes, actions, and details within the content. The summary should state what was changed in which section, followed by "in `filename`". The filename needs to be surrounded by backticks. The summary should offer direct insight into the content of the file, rather than a generic description. Don\'t mention if no changes were made. If there is no content in the diff, just state the file name, path, format, and say that the file was added.',
        addedPrompt:
            'Using the provided git diff of one of my markdown-formatted Obsidian notes that has been added, I need you to produce a concise and specific summary with a maximum of 1-2 short sentences of the added file. The summary should state the core themes, actions, and details within the content. The filename should be surrounded with backticks and formatted in the following manner: "Added `filename` with" followed by the summary. The filename needs to be surrounded by backticks. The summary should offer direct insight into the content of the file, rather than a generic description. ',
        deletedPrompt:
            'Using the provided git diff of one of my markdown-formatted Obsidian notes that has been deleted, I need you to produce a concise and specific summary with a maximum of 1-2 short sentences of what was in the file. The summary should state the core themes, actions, and details within the content. The filename is surrounded with backticks and formatted in the following manner: "Deleted `filename` which contained" followed by the summary. The filename needs to be surrounded by backticks. The summary should offer direct insight into the content of the deleted file, rather than a generic description.',
        lineAuthor: {
            show: false,
            followMovement: "inactive",
            authorDisplay: "initials",
            showCommitHash: false,
            dateTimeFormatOptions: "date",
            dateTimeFormatCustomString: DATE_TIME_FORMAT_MINUTES,
            dateTimeTimezone: "viewer-local",
            coloringMaxAge: "1y",
            // colors were picked via:
            // https://color.adobe.com/de/create/color-accessibility
            colorNew: { r: 255, g: 150, b: 150 },
            colorOld: { r: 120, g: 160, b: 255 },
            textColorCss: "var(--text-muted)", //  more pronounced than line numbers, but less than the content text
            ignoreWhitespace: false,
            gutterSpacingFallbackLength: 5,
        },
    };

export const SOURCE_CONTROL_VIEW_CONFIG = {
    type: "git-view",
    name: "Source Control",
    icon: "git-pull-request",
};

export const HISTORY_VIEW_CONFIG = {
    type: "git-history-view",
    name: "History",
    icon: "history",
};

export const DIFF_VIEW_CONFIG = {
    type: "diff-view",
    name: "Diff View",
    icon: "git-pull-request",
};
