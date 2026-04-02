"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const node_url_1 = require("node:url");
const node_util_1 = __importDefault(require("node:util"));
const commander_1 = require("commander");
const fastest_levenshtein_1 = require("fastest-levenshtein");
const WEBPACK_PACKAGE_IS_CUSTOM = Boolean(process.env.WEBPACK_PACKAGE);
const WEBPACK_PACKAGE = WEBPACK_PACKAGE_IS_CUSTOM
    ? process.env.WEBPACK_PACKAGE
    : "webpack";
const WEBPACK_DEV_SERVER_PACKAGE_IS_CUSTOM = Boolean(process.env.WEBPACK_DEV_SERVER_PACKAGE);
const WEBPACK_DEV_SERVER_PACKAGE = WEBPACK_DEV_SERVER_PACKAGE_IS_CUSTOM
    ? process.env.WEBPACK_DEV_SERVER_PACKAGE
    : "webpack-dev-server";
const EXIT_SIGNALS = ["SIGINT", "SIGTERM"];
const DEFAULT_CONFIGURATION_FILES = [
    "webpack.config",
    ".webpack/webpack.config",
    ".webpack/webpackfile",
];
const DEFAULT_WEBPACK_PACKAGES = ["webpack", "loader"];
class ConfigurationLoadingError extends Error {
    name = "ConfigurationLoadingError";
    constructor(errors) {
        const message1 = errors[0] instanceof Error ? errors[0].message : String(errors[0]);
        const message2 = node_util_1.default.stripVTControlCharacters(errors[1] instanceof Error ? errors[1].message : String(errors[1]));
        const message = `▶ ESM (\`import\`) failed:\n  ${message1.split("\n").join("\n  ")}\n\n▶ CJS (\`require\`) failed:\n  ${message2.split("\n").join("\n  ")}`.trim();
        super(message);
        this.stack = "";
    }
}
class WebpackCLI {
    colors;
    logger;
    #isColorSupportChanged;
    program;
    constructor() {
        this.colors = this.#createColors();
        this.logger = this.getLogger();
        // Initialize program
        this.program = commander_1.program;
        this.program.name("webpack");
        this.program.configureOutput({
            writeErr: (str) => {
                this.logger.error(str);
            },
            outputError: (str, write) => {
                write(`Error: ${this.capitalizeFirstLetter(str.replace(/^error:/, "").trim())}`);
            },
        });
    }
    #createColors(useColor) {
        let pkg;
        try {
            pkg = require(WEBPACK_PACKAGE);
        }
        catch {
            // Nothing
        }
        // Some big repos can have a problem with update webpack everywhere, so let's create a simple proxy for colors
        if (!pkg || !pkg.cli || typeof pkg.cli.createColors !== "function") {
            return new Proxy({}, {
                get() {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    return (...args) => [...args];
                },
            });
        }
        const { createColors, isColorSupported } = pkg.cli;
        const shouldUseColor = useColor || isColorSupported();
        return { ...createColors({ useColor: shouldUseColor }), isColorSupported: shouldUseColor };
    }
    isPromise(value) {
        return typeof value.then === "function";
    }
    isFunction(value) {
        return typeof value === "function";
    }
    capitalizeFirstLetter(str) {
        return str.length > 0 ? str.charAt(0).toUpperCase() + str.slice(1) : str;
    }
    toKebabCase(str) {
        return str.replaceAll(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
    }
    getLogger() {
        return {
            error: (val) => console.error(`[webpack-cli] ${this.colors.red(node_util_1.default.format(val))}`),
            warn: (val) => console.warn(`[webpack-cli] ${this.colors.yellow(val)}`),
            info: (val) => console.info(`[webpack-cli] ${this.colors.cyan(val)}`),
            success: (val) => console.log(`[webpack-cli] ${this.colors.green(val)}`),
            log: (val) => console.log(`[webpack-cli] ${val}`),
            raw: (val) => console.log(val),
        };
    }
    async getDefaultPackageManager() {
        const { sync } = await import("cross-spawn");
        try {
            await node_fs_1.default.promises.access(node_path_1.default.resolve(process.cwd(), "package-lock.json"), node_fs_1.default.constants.F_OK);
            return "npm";
        }
        catch {
            // Nothing
        }
        try {
            await node_fs_1.default.promises.access(node_path_1.default.resolve(process.cwd(), "yarn.lock"), node_fs_1.default.constants.F_OK);
            return "yarn";
        }
        catch {
            // Nothing
        }
        try {
            await node_fs_1.default.promises.access(node_path_1.default.resolve(process.cwd(), "pnpm-lock.yaml"), node_fs_1.default.constants.F_OK);
            return "pnpm";
        }
        catch {
            // Nothing
        }
        try {
            // the sync function below will fail if npm is not installed,
            // an error will be thrown
            if (sync("npm", ["--version"])) {
                return "npm";
            }
        }
        catch {
            // Nothing
        }
        try {
            // the sync function below will fail if yarn is not installed,
            // an error will be thrown
            if (sync("yarn", ["--version"])) {
                return "yarn";
            }
        }
        catch {
            // Nothing
        }
        try {
            // the sync function below will fail if pnpm is not installed,
            // an error will be thrown
            if (sync("pnpm", ["--version"])) {
                return "pnpm";
            }
        }
        catch {
            this.logger.error("No package manager found.");
            process.exit(2);
        }
    }
    async isPackageInstalled(packageName) {
        if (process.versions.pnp) {
            return true;
        }
        try {
            require.resolve(packageName);
            return true;
        }
        catch {
            // Nothing
        }
        // Fallback using fs
        let dir = __dirname;
        do {
            try {
                const stats = await node_fs_1.default.promises.stat(node_path_1.default.join(dir, "node_modules", packageName));
                if (stats.isDirectory()) {
                    return true;
                }
            }
            catch {
                // Nothing
            }
        } while (dir !== (dir = node_path_1.default.dirname(dir)));
        // Extra fallback using fs and hidden API
        // @ts-expect-error No types, private API
        const { globalPaths } = await import("node:module");
        // https://github.com/nodejs/node/blob/v18.9.1/lib/internal/modules/cjs/loader.js#L1274
        const results = await Promise.all(globalPaths.map(async (internalPath) => {
            try {
                const stats = await node_fs_1.default.promises.stat(node_path_1.default.join(internalPath, packageName));
                if (stats.isDirectory()) {
                    return true;
                }
            }
            catch {
                // Nothing
            }
            return false;
        }));
        if (results.includes(true)) {
            return true;
        }
        return false;
    }
    async installPackage(packageName, options = {}) {
        const packageManager = await this.getDefaultPackageManager();
        if (!packageManager) {
            this.logger.error("Can't find package manager");
            process.exit(2);
        }
        if (options.preMessage) {
            options.preMessage();
        }
        const { createInterface } = await import("node:readline");
        const prompt = ({ message, defaultResponse, stream, }) => {
            const rl = createInterface({
                input: process.stdin,
                output: stream,
            });
            return new Promise((resolve) => {
                rl.question(`${message} `, (answer) => {
                    // Close the stream
                    rl.close();
                    const response = (answer || defaultResponse).toLowerCase();
                    // Resolve with the input response
                    if (response === "y" || response === "yes") {
                        resolve(true);
                    }
                    else {
                        resolve(false);
                    }
                });
            });
        };
        // yarn uses 'add' command, rest npm and pnpm both use 'install'
        const commandArguments = [packageManager === "yarn" ? "add" : "install", "-D", packageName];
        const commandToBeRun = `${packageManager} ${commandArguments.join(" ")}`;
        let needInstall;
        try {
            needInstall = await prompt({
                message: `[webpack-cli] Would you like to install '${this.colors.green(packageName)}' package? (That will run '${this.colors.green(commandToBeRun)}') (${this.colors.yellow("Y/n")})`,
                defaultResponse: "Y",
                stream: process.stderr,
            });
        }
        catch (error) {
            this.logger.error(error);
            process.exit(error);
        }
        if (needInstall) {
            const { sync } = await import("cross-spawn");
            try {
                sync(packageManager, commandArguments, { stdio: "inherit" });
            }
            catch (error) {
                this.logger.error(error);
                process.exit(2);
            }
            return packageName;
        }
        process.exit(2);
    }
    async makeCommand(options) {
        const alreadyLoaded = this.program.commands.find((command) => command.name() === options.rawName);
        if (alreadyLoaded) {
            return alreadyLoaded;
        }
        const command = this.program.command(options.name, {
            hidden: options.hidden,
            isDefault: options.isDefault,
        });
        if (options.description) {
            command.description(options.description);
        }
        if (options.usage) {
            command.usage(options.usage);
        }
        if (Array.isArray(options.alias)) {
            command.aliases(options.alias);
        }
        else {
            command.alias(options.alias);
        }
        command.pkg = options.pkg || "webpack-cli";
        const { forHelp } = this.program;
        let allDependenciesInstalled = true;
        if (options.dependencies && options.dependencies.length > 0) {
            for (const dependency of options.dependencies) {
                if (
                // Allow to use `./path/to/webpack.js` outside `node_modules`
                (dependency === WEBPACK_PACKAGE && WEBPACK_PACKAGE_IS_CUSTOM) ||
                    // Allow to use `./path/to/webpack-dev-server.js` outside `node_modules`
                    (dependency === WEBPACK_DEV_SERVER_PACKAGE && WEBPACK_DEV_SERVER_PACKAGE_IS_CUSTOM)) {
                    continue;
                }
                const isPkgExist = await this.isPackageInstalled(dependency);
                if (isPkgExist) {
                    continue;
                }
                allDependenciesInstalled = false;
                if (forHelp) {
                    command.description(`${options.description} To see all available options you need to install ${options.dependencies
                        .map((dependency) => `'${dependency}'`)
                        .join(", ")}.`);
                    continue;
                }
                await this.installPackage(dependency, {
                    preMessage: () => {
                        this.logger.error(`For using '${this.colors.green(options.rawName)}' command you need to install: '${this.colors.green(dependency)}' package.`);
                    },
                });
            }
        }
        command.context = {};
        if (typeof options.preload === "function") {
            let data;
            try {
                data = await options.preload();
            }
            catch (err) {
                if (!forHelp) {
                    throw err;
                }
            }
            command.context = { ...command.context, ...data };
        }
        if (options.options) {
            let commandOptions;
            if (forHelp &&
                !allDependenciesInstalled &&
                options.dependencies &&
                options.dependencies.length > 0) {
                commandOptions = [];
            }
            else if (typeof options.options === "function") {
                commandOptions = await options.options(command);
            }
            else {
                commandOptions = options.options;
            }
            for (const option of commandOptions) {
                this.makeOption(command, option);
            }
        }
        command.action(options.action);
        return command;
    }
    makeOption(command, option) {
        let mainOption;
        let negativeOption;
        const flagsWithAlias = ["devtool", "output-path", "target", "watch", "extends"];
        if (flagsWithAlias.includes(option.name)) {
            [option.alias] = option.name;
        }
        if (option.configs) {
            let needNegativeOption = false;
            let negatedDescription;
            const mainOptionType = new Set();
            for (const config of option.configs) {
                switch (config.type) {
                    case "reset":
                        mainOptionType.add(Boolean);
                        break;
                    case "boolean":
                        if (!needNegativeOption) {
                            needNegativeOption = true;
                            negatedDescription = config.negatedDescription;
                        }
                        mainOptionType.add(Boolean);
                        break;
                    case "number":
                        mainOptionType.add(Number);
                        break;
                    case "string":
                    case "path":
                    case "RegExp":
                        mainOptionType.add(String);
                        break;
                    case "enum": {
                        let hasFalseEnum = false;
                        for (const value of config.values || []) {
                            switch (typeof value) {
                                case "string":
                                    mainOptionType.add(String);
                                    break;
                                case "number":
                                    mainOptionType.add(Number);
                                    break;
                                case "boolean":
                                    if (!hasFalseEnum && value === false) {
                                        hasFalseEnum = true;
                                        break;
                                    }
                                    mainOptionType.add(Boolean);
                                    break;
                            }
                        }
                        if (!needNegativeOption) {
                            needNegativeOption = hasFalseEnum;
                            negatedDescription = config.negatedDescription;
                        }
                    }
                }
            }
            mainOption = {
                flags: option.alias ? `-${option.alias}, --${option.name}` : `--${option.name}`,
                valueName: option.valueName || "value",
                description: option.description || "",
                type: mainOptionType,
                multiple: option.multiple,
                defaultValue: option.defaultValue,
                configs: option.configs,
            };
            if (needNegativeOption) {
                negativeOption = {
                    flags: `--no-${option.name}`,
                    description: negatedDescription || option.negatedDescription || `Negative '${option.name}' option.`,
                };
            }
        }
        else {
            mainOption = {
                flags: option.alias ? `-${option.alias}, --${option.name}` : `--${option.name}`,
                valueName: option.valueName || "value",
                description: option.description || "",
                type: option.type
                    ? new Set(Array.isArray(option.type) ? option.type : [option.type])
                    : new Set([Boolean]),
                multiple: option.multiple,
                defaultValue: option.defaultValue,
            };
            if (option.negative) {
                negativeOption = {
                    flags: `--no-${option.name}`,
                    description: option.negatedDescription || `Negative '${option.name}' option.`,
                };
            }
        }
        if (mainOption.type.size > 1 && mainOption.type.has(Boolean)) {
            mainOption.flags = `${mainOption.flags} [${mainOption.valueName}${mainOption.multiple ? "..." : ""}]`;
        }
        else if (mainOption.type.size > 0 && !mainOption.type.has(Boolean)) {
            mainOption.flags = `${mainOption.flags} <${mainOption.valueName}${mainOption.multiple ? "..." : ""}>`;
        }
        if (mainOption.type.size === 1) {
            if (mainOption.type.has(Number)) {
                let skipDefault = true;
                const optionForCommand = new commander_1.Option(mainOption.flags, mainOption.description)
                    .argParser((value, prev = []) => {
                    if (mainOption.defaultValue && mainOption.multiple && skipDefault) {
                        prev = [];
                        skipDefault = false;
                    }
                    return mainOption.multiple ? [...prev, Number(value)] : Number(value);
                })
                    .default(mainOption.defaultValue);
                optionForCommand.hidden = option.hidden || false;
                command.addOption(optionForCommand);
            }
            else if (mainOption.type.has(String)) {
                let skipDefault = true;
                const optionForCommand = new commander_1.Option(mainOption.flags, mainOption.description)
                    .argParser((value, prev = []) => {
                    if (mainOption.defaultValue && mainOption.multiple && skipDefault) {
                        prev = [];
                        skipDefault = false;
                    }
                    return mainOption.multiple ? [...prev, value] : value;
                })
                    .default(mainOption.defaultValue);
                optionForCommand.hidden = option.hidden || false;
                if (option.configs) {
                    optionForCommand.configs = option.configs;
                }
                command.addOption(optionForCommand);
            }
            else if (mainOption.type.has(Boolean)) {
                const optionForCommand = new commander_1.Option(mainOption.flags, mainOption.description).default(mainOption.defaultValue);
                optionForCommand.hidden = option.hidden || false;
                command.addOption(optionForCommand);
            }
            else {
                const optionForCommand = new commander_1.Option(mainOption.flags, mainOption.description)
                    .argParser([...mainOption.type][0])
                    .default(mainOption.defaultValue);
                optionForCommand.hidden = option.hidden || false;
                command.addOption(optionForCommand);
            }
        }
        else if (mainOption.type.size > 1) {
            let skipDefault = true;
            const optionForCommand = new commander_1.Option(mainOption.flags, mainOption.description)
                .argParser((value, prev = []) => {
                if (mainOption.defaultValue && mainOption.multiple && skipDefault) {
                    prev = [];
                    skipDefault = false;
                }
                if (mainOption.type.has(Number)) {
                    const numberValue = Number(value);
                    if (!Number.isNaN(numberValue)) {
                        return mainOption.multiple ? [...prev, numberValue] : numberValue;
                    }
                }
                if (mainOption.type.has(String)) {
                    return mainOption.multiple ? [...prev, value] : value;
                }
                return value;
            })
                .default(mainOption.defaultValue);
            optionForCommand.hidden = option.hidden || false;
            if (option.configs) {
                optionForCommand.configs = option.configs;
            }
            command.addOption(optionForCommand);
        }
        else if (mainOption.type.size === 0 && negativeOption) {
            const optionForCommand = new commander_1.Option(mainOption.flags, mainOption.description);
            // Hide stub option
            // TODO find a solution to hide such options in the new commander version, for example `--performance` and `--no-performance` because we don't have `--performance` at all
            optionForCommand.hidden = option.hidden || true;
            optionForCommand.internal = true;
            command.addOption(optionForCommand);
        }
        if (negativeOption) {
            const optionForCommand = new commander_1.Option(negativeOption.flags, negativeOption.description).default(false);
            optionForCommand.hidden = option.hidden || option.negativeHidden || false;
            command.addOption(optionForCommand);
        }
    }
    isMultipleConfiguration(config) {
        return Array.isArray(config);
    }
    isMultipleCompiler(compiler) {
        return compiler.compilers;
    }
    isValidationError(error) {
        return error.name === "ValidationError";
    }
    schemaToOptions(webpackMod, schema = undefined, additionalOptions = [], override = {}) {
        const args = webpackMod.cli.getArguments(schema);
        // Take memory
        const options = Array.from({
            length: additionalOptions.length + Object.keys(args).length,
        });
        let i = 0;
        // Adding own options
        for (; i < additionalOptions.length; i++)
            options[i] = additionalOptions[i];
        // Adding core options
        for (const name in args) {
            const meta = args[name];
            options[i++] = {
                ...meta,
                name,
                description: meta.description,
                hidden: !this.#minimumHelpOptions.has(name),
                negativeHidden: !this.#minimumNegativeHelpOptions.has(name),
                ...override,
            };
        }
        return options;
    }
    #processArguments(webpackMod, args, configuration, values) {
        const problems = webpackMod.cli.processArguments(args, configuration, values);
        if (problems) {
            const groupBy = (xs, key) => xs.reduce((rv, problem) => {
                const path = problem[key];
                (rv[path] ||= []).push(problem);
                return rv;
            }, {});
            const problemsByPath = groupBy(problems, "path");
            for (const path in problemsByPath) {
                const problems = problemsByPath[path];
                for (const problem of problems) {
                    this.logger.error(`${this.capitalizeFirstLetter(problem.type.replaceAll("-", " "))}${problem.value ? ` '${problem.value}'` : ""} for the '--${problem.argument.replaceAll(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)}' option${problem.index ? ` by index '${problem.index}'` : ""}`);
                    if (problem.expected) {
                        if (problem.expected === "true | false") {
                            this.logger.error("Expected: without value or negative option");
                        }
                        else {
                            this.logger.error(`Expected: '${problem.expected}'`);
                        }
                    }
                }
            }
            process.exit(2);
        }
    }
    async #outputHelp(options, isVerbose, isHelpCommandSyntax, program) {
        const isOption = (value) => value.startsWith("-");
        const isGlobalOption = (value) => value === "--color" ||
            value === "--no-color" ||
            value === "-v" ||
            value === "--version" ||
            value === "-h" ||
            value === "--help";
        const { bold } = this.colors;
        const outputIncorrectUsageOfHelp = () => {
            this.logger.error("Incorrect use of help");
            this.logger.error("Please use: 'webpack help [command] [option]' | 'webpack [command] --help'");
            this.logger.error("Run 'webpack --help' to see available commands and options");
            process.exit(2);
        };
        const isGlobalHelp = options.length === 0;
        const isCommandHelp = options.length === 1 && !isOption(options[0]);
        if (isGlobalHelp || isCommandHelp) {
            program.configureHelp({
                helpWidth: typeof process.env.WEBPACK_CLI_HELP_WIDTH !== "undefined"
                    ? Number.parseInt(process.env.WEBPACK_CLI_HELP_WIDTH, 10)
                    : 40,
                sortSubcommands: true,
                // Support multiple aliases
                commandUsage: (command) => {
                    let parentCmdNames = "";
                    for (let parentCmd = command.parent; parentCmd; parentCmd = parentCmd.parent) {
                        parentCmdNames = `${parentCmd.name()} ${parentCmdNames}`;
                    }
                    if (isGlobalHelp) {
                        return `${parentCmdNames}${command.usage()}\n${bold("Alternative usage to run commands:")} ${parentCmdNames}[command] [options]`;
                    }
                    return `${parentCmdNames}${command.name()}|${command
                        .aliases()
                        .join("|")} ${command.usage()}`;
                },
                // Support multiple aliases
                subcommandTerm: (command) => {
                    const usage = command.usage();
                    return `${command.name()}|${command.aliases().join("|")}${usage.length > 0 ? ` ${usage}` : ""}`;
                },
                visibleOptions: function visibleOptions(command) {
                    return command.options.filter((option) => {
                        if (option.internal) {
                            return false;
                        }
                        // Hide `--watch` option when developer use `webpack watch --help`
                        if ((options[0] === "w" || options[0] === "watch") &&
                            (option.name() === "watch" || option.name() === "no-watch")) {
                            return false;
                        }
                        if (option.hidden) {
                            return isVerbose;
                        }
                        return true;
                    });
                },
                padWidth(command, helper) {
                    return Math.max(helper.longestArgumentTermLength(command, helper), helper.longestOptionTermLength(command, helper), 
                    // For global options
                    helper.longestOptionTermLength(program, helper), helper.longestSubcommandTermLength(isGlobalHelp ? program : command, helper));
                },
                formatHelp: (command, helper) => {
                    const formatItem = (term, description) => {
                        if (description) {
                            return helper.formatItem(term, helper.padWidth(command, helper), description, helper);
                        }
                        return term;
                    };
                    const formatList = (textArray) => textArray.join("\n").replaceAll(/^/gm, "");
                    // Usage
                    let output = [`${bold("Usage:")} ${helper.commandUsage(command)}`, ""];
                    // Description
                    const commandDescription = isGlobalHelp
                        ? "The build tool for modern web applications."
                        : helper.commandDescription(command);
                    if (commandDescription.length > 0) {
                        output = [...output, commandDescription, ""];
                    }
                    // Arguments
                    const argumentList = helper
                        .visibleArguments(command)
                        .map((argument) => formatItem(argument.name(), argument.description));
                    if (argumentList.length > 0) {
                        output = [...output, bold("Arguments:"), formatList(argumentList), ""];
                    }
                    // Options
                    const optionList = helper
                        .visibleOptions(command)
                        .map((option) => formatItem(helper.optionTerm(option), helper.optionDescription(option)));
                    if (optionList.length > 0) {
                        output = [...output, bold("Options:"), formatList(optionList), ""];
                    }
                    // Global options
                    const globalOptionList = program.options.map((option) => formatItem(helper.optionTerm(option), helper.optionDescription(option)));
                    if (globalOptionList.length > 0) {
                        output = [...output, bold("Global options:"), formatList(globalOptionList), ""];
                    }
                    // Commands
                    const commandList = helper
                        .visibleCommands(isGlobalHelp ? program : command)
                        .map((command) => formatItem(helper.subcommandTerm(command), helper.subcommandDescription(command)));
                    if (commandList.length > 0) {
                        output = [...output, bold("Commands:"), formatList(commandList), ""];
                    }
                    return output.join("\n");
                },
            });
            if (isGlobalHelp) {
                await Promise.all(Object.values(this.#commands).map((knownCommand) => this.#loadCommandByName(knownCommand.rawName)));
                const buildCommand = this.#findCommandByName(this.#commands.build.rawName);
                if (buildCommand) {
                    this.logger.raw(buildCommand.helpInformation());
                }
            }
            else {
                const [name] = options;
                const command = await this.#loadCommandByName(name);
                if (!command) {
                    this.logger.error(`Can't find and load command '${name}'`);
                    this.logger.error("Run 'webpack --help' to see available commands and options.");
                    process.exit(2);
                }
                this.logger.raw(command.helpInformation());
            }
        }
        else if (isHelpCommandSyntax) {
            let isCommandSpecified = false;
            let commandName = this.#commands.build.rawName;
            let optionName = "";
            if (options.length === 1) {
                [optionName] = options;
            }
            else if (options.length === 2) {
                isCommandSpecified = true;
                [commandName, optionName] = options;
                if (isOption(commandName)) {
                    outputIncorrectUsageOfHelp();
                }
            }
            else {
                outputIncorrectUsageOfHelp();
            }
            const command = isGlobalOption(optionName)
                ? program
                : await this.#loadCommandByName(commandName);
            if (!command) {
                this.logger.error(`Can't find and load command '${commandName}'`);
                this.logger.error("Run 'webpack --help' to see available commands and options");
                process.exit(2);
            }
            const option = command.options.find((option) => option.short === optionName || option.long === optionName);
            if (!option) {
                this.logger.error(`Unknown option '${optionName}'`);
                this.logger.error("Run 'webpack --help' to see available commands and options");
                process.exit(2);
                return;
            }
            const nameOutput = option.flags.replace(/^.+[[<]/, "").replace(/(\.\.\.)?[\]>].*$/, "") +
                (option.variadic === true ? "..." : "");
            const value = option.required ? `<${nameOutput}>` : option.optional ? `[${nameOutput}]` : "";
            this.logger.raw(`${bold("Usage")}: webpack${isCommandSpecified ? ` ${commandName}` : ""} ${option.long}${value ? ` ${value}` : ""}`);
            if (option.short) {
                this.logger.raw(`${bold("Short:")} webpack${isCommandSpecified ? ` ${commandName}` : ""} ${option.short}${value ? ` ${value}` : ""}`);
            }
            if (option.description) {
                this.logger.raw(`${bold("Description:")} ${option.description}`);
            }
            const { configs } = option;
            if (configs) {
                const possibleValues = configs.reduce((accumulator, currentValue) => {
                    if (currentValue.values) {
                        return [...accumulator, ...currentValue.values];
                    }
                    return accumulator;
                }, []);
                if (possibleValues.length > 0) {
                    // Convert the possible values to a union type string
                    // ['mode', 'development', 'production'] => "'mode' | 'development' | 'production'"
                    // [false, 'eval'] => "false | 'eval'"
                    const possibleValuesUnionTypeString = possibleValues
                        .map((value) => (typeof value === "string" ? `'${value}'` : value))
                        .join(" | ");
                    this.logger.raw(`${bold("Possible values:")} ${possibleValuesUnionTypeString}`);
                }
            }
            this.logger.raw("");
            // TODO implement this after refactor cli arguments
            // logger.raw('Documentation: https://webpack.js.org/option/name/');
        }
        else {
            outputIncorrectUsageOfHelp();
        }
        this.logger.raw("To see list of all supported commands and options run 'webpack --help=verbose'.\n");
        this.logger.raw(`${bold("Webpack documentation:")} https://webpack.js.org/.`);
        this.logger.raw(`${bold("CLI documentation:")} https://webpack.js.org/api/cli/.`);
        this.logger.raw(`${bold("Made with ♥ by the webpack team")}.`);
        process.exit(0);
    }
    async #renderVersion(options = {}) {
        let info = await this.#getInfoOutput({
            ...options,
            information: {
                npmPackages: `{${DEFAULT_WEBPACK_PACKAGES.map((item) => `*${item}*`).join(",")}}`,
            },
        });
        if (typeof options.output === "undefined") {
            info = info.replace("Packages:", "").replaceAll(/^\s+/gm, "").trim();
        }
        return info;
    }
    async #getInfoOutput(options) {
        let { output } = options;
        const envinfoConfig = {};
        if (output) {
            // Remove quotes if exist
            output = output.replaceAll(/['"]+/g, "");
            switch (output) {
                case "markdown":
                    envinfoConfig.markdown = true;
                    break;
                case "json":
                    envinfoConfig.json = true;
                    break;
                default:
                    this.logger.error(`'${output}' is not a valid value for output`);
                    process.exit(2);
            }
        }
        let envinfoOptions;
        if (options.information) {
            envinfoOptions = options.information;
        }
        else {
            const defaultInformation = {
                Binaries: ["Node", "Yarn", "npm", "pnpm"],
                Browsers: [
                    "Brave Browser",
                    "Chrome",
                    "Chrome Canary",
                    "Edge",
                    "Firefox",
                    "Firefox Developer Edition",
                    "Firefox Nightly",
                    "Internet Explorer",
                    "Safari",
                    "Safari Technology Preview",
                ],
                // @ts-expect-error No in types
                Monorepos: ["Yarn Workspaces", "Lerna"],
                System: ["OS", "CPU", "Memory"],
                npmGlobalPackages: ["webpack", "webpack-cli", "webpack-dev-server"],
            };
            const npmPackages = [...DEFAULT_WEBPACK_PACKAGES, ...(options.additionalPackage || [])];
            defaultInformation.npmPackages = `{${npmPackages.map((item) => `*${item}*`).join(",")}}`;
            envinfoOptions = defaultInformation;
        }
        const envinfo = (await import("envinfo")).default;
        let info = await envinfo.run(envinfoOptions, envinfoConfig);
        info = info.replace("npmPackages", "Packages");
        info = info.replace("npmGlobalPackages", "Global Packages");
        return info;
    }
    async #loadPackage(pkg, isCustom) {
        const importTarget = isCustom && /^(?:[A-Za-z]:(\\|\/)|\\\\|\/)/.test(pkg) ? (0, node_url_1.pathToFileURL)(pkg).toString() : pkg;
        return (await import(importTarget)).default;
    }
    async loadWebpack() {
        return this.#loadPackage(WEBPACK_PACKAGE, WEBPACK_PACKAGE_IS_CUSTOM);
    }
    async loadWebpackDevServer() {
        return this.#loadPackage(WEBPACK_DEV_SERVER_PACKAGE, WEBPACK_DEV_SERVER_PACKAGE_IS_CUSTOM);
    }
    #minimumHelpOptions = new Set([
        "mode",
        "watch",
        "watch-options-stdin",
        "stats",
        "devtool",
        "entry",
        "target",
        "name",
        "output-path",
        "extends",
    ]);
    #minimumNegativeHelpOptions = new Set(["devtool"]);
    #CLIOptions = [
        // For configs
        {
            name: "config",
            alias: "c",
            configs: [
                {
                    type: "string",
                },
            ],
            multiple: true,
            valueName: "pathToConfigFile",
            description: 'Provide path to one or more webpack configuration files to process, e.g. "./webpack.config.js".',
            hidden: false,
        },
        {
            name: "config-name",
            configs: [
                {
                    type: "string",
                },
            ],
            multiple: true,
            valueName: "name",
            description: "Name(s) of particular configuration(s) to use if configuration file exports an array of multiple configurations.",
            hidden: false,
        },
        {
            name: "merge",
            alias: "m",
            configs: [
                {
                    type: "enum",
                    values: [true],
                },
            ],
            description: "Merge two or more configurations using 'webpack-merge'.",
            hidden: false,
        },
        // Complex configs
        {
            name: "env",
            type: (value, previous = {}) => {
                // This ensures we're only splitting by the first `=`
                const [allKeys, val] = value.split(/[=](.+)/, 2);
                const splitKeys = allKeys.split(/\.(?!$)/);
                let prevRef = previous;
                for (let [index, someKey] of splitKeys.entries()) {
                    // https://github.com/webpack/webpack-cli/issues/3284
                    if (someKey.endsWith("=")) {
                        // remove '=' from key
                        someKey = someKey.slice(0, -1);
                        // @ts-expect-error we explicitly want to set it to undefined
                        prevRef[someKey] = undefined;
                        continue;
                    }
                    if (!prevRef[someKey]) {
                        prevRef[someKey] = {};
                    }
                    if (typeof prevRef[someKey] === "string") {
                        prevRef[someKey] = {};
                    }
                    if (index === splitKeys.length - 1) {
                        prevRef[someKey] = typeof val === "string" ? val : true;
                    }
                    prevRef = prevRef[someKey];
                }
                return previous;
            },
            multiple: true,
            description: 'Environment variables passed to the configuration when it is a function, e.g. "myvar" or "myvar=myval".',
            hidden: false,
        },
        {
            name: "config-node-env",
            configs: [
                {
                    type: "string",
                },
            ],
            multiple: false,
            description: "Sets process.env.NODE_ENV to the specified value for access within the configuration.",
            hidden: false,
        },
        // Adding more plugins
        {
            name: "analyze",
            configs: [
                {
                    type: "enum",
                    values: [true],
                },
            ],
            multiple: false,
            description: "It invokes webpack-bundle-analyzer plugin to get bundle information.",
            hidden: false,
        },
        {
            name: "progress",
            configs: [
                {
                    type: "string",
                },
                {
                    type: "enum",
                    values: [true],
                },
            ],
            description: "Print compilation progress during build.",
            hidden: false,
        },
        // Output options
        {
            name: "json",
            configs: [
                {
                    type: "string",
                },
                {
                    type: "enum",
                    values: [true],
                },
            ],
            alias: "j",
            valueName: "pathToJsonFile",
            description: "Prints result as JSON or store it in a file.",
            hidden: false,
        },
        {
            name: "fail-on-warnings",
            configs: [
                {
                    type: "enum",
                    values: [true],
                },
            ],
            description: "Stop webpack-cli process with non-zero exit code on warnings from webpack.",
            hidden: false,
        },
        {
            name: "disable-interpret",
            configs: [
                {
                    type: "enum",
                    values: [true],
                },
            ],
            description: "Disable interpret for loading the config file.",
            hidden: false,
        },
    ];
    #commands = {
        build: {
            rawName: "build",
            name: "build [entries...]",
            alias: ["bundle", "b"],
            description: "Run webpack (default command, can be omitted).",
            usage: "[entries...] [options]",
            dependencies: [WEBPACK_PACKAGE],
            preload: async () => {
                const webpack = await this.loadWebpack();
                return { webpack };
            },
            options: async (cmd) => this.schemaToOptions(cmd.context.webpack, undefined, this.#CLIOptions),
            action: async (entries, options, cmd) => {
                const { webpack } = cmd.context;
                if (entries.length > 0) {
                    options.entry = [...entries, ...(options.entry || [])];
                }
                options.webpack = webpack;
                await this.runWebpack(options, false);
            },
        },
        watch: {
            rawName: "watch",
            name: "watch [entries...]",
            alias: "w",
            description: "Run webpack and watch for files changes.",
            usage: "[entries...] [options]",
            dependencies: [WEBPACK_PACKAGE],
            preload: async () => {
                const webpack = await this.loadWebpack();
                return { webpack };
            },
            options: async (cmd) => this.schemaToOptions(cmd.context.webpack, undefined, this.#CLIOptions),
            action: async (entries, options, cmd) => {
                const { webpack } = cmd.context;
                if (entries.length > 0) {
                    options.entry = [...entries, ...(options.entry || [])];
                }
                options.webpack = webpack;
                await this.runWebpack(options, true);
            },
        },
        serve: {
            rawName: "serve",
            name: "serve [entries...]",
            alias: ["server", "s"],
            description: "Run the webpack dev server and watch for source file changes while serving.",
            usage: "[entries...] [options]",
            dependencies: [WEBPACK_PACKAGE, WEBPACK_DEV_SERVER_PACKAGE],
            preload: async () => {
                const webpack = await this.loadWebpack();
                const webpackOptions = this.schemaToOptions(webpack, undefined, this.#CLIOptions);
                const devServer = await this.loadWebpackDevServer();
                // @ts-expect-error different versions of the `Schema` type
                const devServerOptions = this.schemaToOptions(webpack, devServer.schema, undefined, {
                    hidden: false,
                    negativeHidden: false,
                });
                return { webpack, webpackOptions, devServer, devServerOptions };
            },
            options: (cmd) => {
                const { webpackOptions, devServerOptions } = cmd.context;
                return [...webpackOptions, ...devServerOptions];
            },
            action: async (entries, options, cmd) => {
                const { webpack, webpackOptions, devServerOptions } = cmd.context;
                const webpackCLIOptions = { webpack, isWatchingLikeCommand: true };
                const devServerCLIOptions = {};
                for (const optionName in options) {
                    const kebabedOption = this.toKebabCase(optionName);
                    const isBuiltInOption = webpackOptions.find((builtInOption) => builtInOption.name === kebabedOption);
                    if (isBuiltInOption) {
                        webpackCLIOptions[optionName] = options[optionName];
                    }
                    else {
                        devServerCLIOptions[optionName] = options[optionName];
                    }
                }
                if (entries.length > 0) {
                    webpackCLIOptions.entry = [...entries, ...(options.entry || [])];
                }
                webpackCLIOptions.argv = {
                    ...options,
                    env: { WEBPACK_SERVE: true, ...options.env },
                };
                const compiler = await this.createCompiler(webpackCLIOptions);
                if (!compiler) {
                    return;
                }
                const DevServer = cmd.context.devServer;
                const servers = [];
                if (this.#needWatchStdin(compiler)) {
                    process.stdin.on("end", () => {
                        Promise.all(servers.map((server) => server.stop())).then(() => {
                            process.exit(0);
                        });
                    });
                    process.stdin.resume();
                }
                const compilers = this.isMultipleCompiler(compiler) ? compiler.compilers : [compiler];
                const possibleCompilers = compilers.filter((compiler) => compiler.options.devServer);
                const compilersForDevServer = possibleCompilers.length > 0 ? possibleCompilers : [compilers[0]];
                const usedPorts = [];
                for (const compilerForDevServer of compilersForDevServer) {
                    if (compilerForDevServer.options.devServer === false) {
                        continue;
                    }
                    const devServerConfiguration = compilerForDevServer.options.devServer || {};
                    const args = {};
                    const values = {};
                    for (const name of Object.keys(options)) {
                        if (name === "argv")
                            continue;
                        const kebabName = this.toKebabCase(name);
                        const arg = devServerOptions.find((item) => item.name === kebabName);
                        if (arg) {
                            args[name] = arg;
                            // We really don't know what the value is
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            values[name] = options[name];
                        }
                    }
                    if (Object.keys(values).length > 0) {
                        this.#processArguments(webpack, args, devServerConfiguration, values);
                    }
                    if (devServerConfiguration.port) {
                        const portNumber = Number(devServerConfiguration.port);
                        if (usedPorts.includes(portNumber)) {
                            throw new Error("Unique ports must be specified for each devServer option in your webpack configuration. Alternatively, run only 1 devServer config using the --config-name flag to specify your desired config.");
                        }
                        usedPorts.push(portNumber);
                    }
                    try {
                        const server = new DevServer(devServerConfiguration, compiler);
                        await server.start();
                        servers.push(server);
                    }
                    catch (error) {
                        if (this.isValidationError(error)) {
                            this.logger.error(error.message);
                        }
                        else {
                            this.logger.error(error);
                        }
                        process.exit(2);
                    }
                }
                if (servers.length === 0) {
                    this.logger.error("No dev server configurations to run");
                    process.exit(2);
                }
            },
        },
        help: {
            rawName: "help",
            name: "help [command] [option]",
            alias: "h",
            description: "Display help for commands and options.",
            action: () => {
                // Nothing, just stub
            },
        },
        version: {
            rawName: "version",
            name: "version",
            alias: "v",
            usage: "[options]",
            description: "Output the version number of 'webpack', 'webpack-cli' and 'webpack-dev-server' and other packages.",
            options: [
                {
                    name: "output",
                    alias: "o",
                    configs: [
                        {
                            type: "string",
                        },
                    ],
                    description: "To get the output in a specified format (accept json or markdown)",
                    hidden: false,
                },
            ],
            action: async (options) => {
                const info = await this.#renderVersion(options);
                this.logger.raw(info);
            },
        },
        info: {
            rawName: "info",
            name: "info",
            alias: "i",
            usage: "[options]",
            description: "Outputs information about your system.",
            options: [
                {
                    name: "output",
                    alias: "o",
                    configs: [
                        {
                            type: "string",
                        },
                    ],
                    description: "To get the output in a specified format (accept json or markdown)",
                    hidden: false,
                },
                {
                    name: "additional-package",
                    alias: "a",
                    configs: [{ type: "string" }],
                    multiple: true,
                    description: "Adds additional packages to the output",
                    hidden: false,
                },
            ],
            action: async (options) => {
                const info = await this.#getInfoOutput(options);
                this.logger.raw(info);
            },
        },
        configtest: {
            rawName: "configtest",
            name: "configtest [config-path]",
            alias: "t",
            description: "Validate a webpack configuration.",
            dependencies: [WEBPACK_PACKAGE],
            options: [],
            preload: async () => {
                const webpack = await this.loadWebpack();
                return { webpack };
            },
            action: async (configPath, _options, cmd) => {
                const { webpack } = cmd.context;
                const env = {};
                const argv = { env };
                const config = await this.loadConfig(configPath ? { env, argv, webpack, config: [configPath] } : { env, argv, webpack });
                const configPaths = new Set();
                if (Array.isArray(config.options)) {
                    for (const options of config.options) {
                        const loadedConfigPaths = config.path.get(options);
                        if (loadedConfigPaths) {
                            for (const path of loadedConfigPaths)
                                configPaths.add(path);
                        }
                    }
                }
                else if (config.path.get(config.options)) {
                    const loadedConfigPaths = config.path.get(config.options);
                    if (loadedConfigPaths) {
                        for (const path of loadedConfigPaths)
                            configPaths.add(path);
                    }
                }
                if (configPaths.size === 0) {
                    this.logger.error("No configuration found.");
                    process.exit(2);
                }
                this.logger.info(`Validate '${[...configPaths].join(" ,")}'.`);
                try {
                    cmd.context.webpack.validate(config.options);
                }
                catch (error) {
                    if (this.isValidationError(error)) {
                        this.logger.error(error.message);
                    }
                    else {
                        this.logger.error(error);
                    }
                    process.exit(2);
                }
                this.logger.success("There are no validation errors in the given webpack configuration.");
            },
        },
    };
    #isCommand(input, commandOptions) {
        const longName = commandOptions.rawName;
        if (input === longName) {
            return true;
        }
        if (commandOptions.alias) {
            if (Array.isArray(commandOptions.alias)) {
                return commandOptions.alias.includes(input);
            }
            return commandOptions.alias === input;
        }
        return false;
    }
    #findCommandByName(name) {
        return this.program.commands.find((command) => name === command.name() || command.aliases().includes(name));
    }
    async #loadCommandByName(commandName) {
        if (this.#isCommand(commandName, this.#commands.build)) {
            return await this.makeCommand(this.#commands.build);
        }
        else if (this.#isCommand(commandName, this.#commands.serve)) {
            return await this.makeCommand(this.#commands.serve);
        }
        else if (this.#isCommand(commandName, this.#commands.watch)) {
            return await this.makeCommand(this.#commands.watch);
        }
        else if (this.#isCommand(commandName, this.#commands.help)) {
            // Stub for the `help` command
            return await this.makeCommand(this.#commands.help);
        }
        else if (this.#isCommand(commandName, this.#commands.version)) {
            return await this.makeCommand(this.#commands.version);
        }
        else if (this.#isCommand(commandName, this.#commands.info)) {
            return await this.makeCommand(this.#commands.info);
        }
        else if (this.#isCommand(commandName, this.#commands.configtest)) {
            return await this.makeCommand(this.#commands.configtest);
        }
        const pkg = commandName;
        let LoadedCommand;
        try {
            LoadedCommand = (await import(pkg)).default;
        }
        catch (error) {
            if (error.code !== "ERR_MODULE_NOT_FOUND") {
                this.logger.error(`Unable to load '${pkg}' command`);
                this.logger.error(error);
                process.exit(2);
            }
            return;
        }
        let command;
        let externalCommand;
        try {
            command = new LoadedCommand();
            externalCommand = await command.apply(this);
        }
        catch (error) {
            this.logger.error(`Unable to load '${pkg}' command`);
            this.logger.error(error);
            process.exit(2);
        }
        return externalCommand;
    }
    async run(args, parseOptions) {
        // Default `--color` and `--no-color` options
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const self = this;
        // Register own exit
        this.program.exitOverride((error) => {
            if (error.exitCode === 0) {
                process.exit(0);
                return;
            }
            if (error.code === "commander.unknownOption") {
                let name = error.message.match(/'(.+)'/);
                if (name) {
                    name = name[1].slice(2);
                    if (name.includes("=")) {
                        [name] = name.split("=");
                    }
                    const { operands } = this.program.parseOptions(this.program.args);
                    const operand = typeof operands[0] !== "undefined" ? operands[0] : this.#commands.build.rawName;
                    if (operand) {
                        const command = this.#findCommandByName(operand);
                        if (!command) {
                            this.logger.error(`Can't find and load command '${operand}'`);
                            this.logger.error("Run 'webpack --help' to see available commands and options");
                            process.exit(2);
                        }
                        for (const option of command.options) {
                            if (!option.internal &&
                                (0, fastest_levenshtein_1.distance)(name, option.long?.slice(2)) < 3) {
                                this.logger.error(`Did you mean '--${option.name()}'?`);
                            }
                        }
                    }
                }
            }
            this.logger.error("Run 'webpack --help' to see available commands and options");
            process.exit(2);
        });
        this.program.option("--color", "Enable colors on console.");
        this.program.on("option:color", function color() {
            const { color } = this.opts();
            self.#isColorSupportChanged = color;
            self.colors = self.#createColors(color);
        });
        this.program.option("--no-color", "Disable colors on console.");
        this.program.on("option:no-color", function noColor() {
            const { color } = this.opts();
            self.#isColorSupportChanged = color;
            self.colors = self.#createColors(color);
        });
        this.program.option("-v, --version", "Output the version number of 'webpack', 'webpack-cli' and 'webpack-dev-server' and other packages.");
        // webpack-cli has it's own logic for showing suggestions
        this.program.showSuggestionAfterError(false);
        // Suppress the default help option
        this.program.helpOption(false);
        // Suppress the default help command
        this.program.helpCommand(false);
        this.program.option("-h, --help [verbose]", "Display help for commands and options.");
        // Basic command for lazy loading other commands
        // By default we don't load any commands and options, commands and options registration takes a lot of time instead we load them lazily
        // That is why we need to set `allowUnknownOption` to `true`, otherwise commander will not work
        this.program.allowUnknownOption(true);
        // For lazy loading other commands too
        this.program.allowExcessArguments(true);
        this.program.action(async (options) => {
            const { operands, unknown } = this.program.parseOptions(this.program.args);
            const defaultCommandNameToRun = this.#commands.build.rawName;
            const hasOperand = typeof operands[0] !== "undefined";
            const operand = hasOperand ? operands[0] : defaultCommandNameToRun;
            const isHelpOption = typeof options.help !== "undefined";
            const isHelpCommandSyntax = this.#isCommand(operand, this.#commands.help);
            if (isHelpOption || isHelpCommandSyntax) {
                let isVerbose = false;
                if (isHelpOption && typeof options.help === "string") {
                    if (options.help !== "verbose") {
                        this.logger.error("Unknown value for '--help' option, please use '--help=verbose'");
                        process.exit(2);
                    }
                    isVerbose = true;
                }
                this.program.forHelp = true;
                const optionsForHelp = [
                    ...(isHelpOption && hasOperand ? [operand] : []),
                    ...operands.slice(1),
                    ...unknown,
                    ...(isHelpCommandSyntax && typeof options.color !== "undefined"
                        ? [options.color ? "--color" : "--no-color"]
                        : []),
                    ...(isHelpCommandSyntax && typeof options.version !== "undefined" ? ["--version"] : []),
                ];
                await this.#outputHelp(optionsForHelp, isVerbose, isHelpCommandSyntax, this.program);
            }
            const isVersionOption = typeof options.version !== "undefined";
            if (isVersionOption) {
                const info = await this.#renderVersion();
                this.logger.raw(info);
                process.exit(0);
            }
            let isKnownCommand = false;
            for (const command of Object.values(this.#commands)) {
                if (command.rawName === operand ||
                    (Array.isArray(command.alias)
                        ? command.alias.includes(operand)
                        : command.alias === operand)) {
                    isKnownCommand = true;
                    break;
                }
            }
            let command;
            let commandOperands = operands.slice(1);
            if (isKnownCommand) {
                command = await this.#loadCommandByName(operand);
            }
            else {
                let isEntrySyntax;
                try {
                    await node_fs_1.default.promises.access(operand, node_fs_1.default.constants.F_OK);
                    isEntrySyntax = true;
                }
                catch {
                    isEntrySyntax = false;
                }
                if (isEntrySyntax) {
                    commandOperands = operands;
                    command = await this.#loadCommandByName(defaultCommandNameToRun);
                }
                else {
                    // Try to load external command
                    try {
                        command = await this.#loadCommandByName(operand);
                    }
                    catch {
                        // Nothing
                    }
                    if (!command) {
                        this.logger.error(`Unknown command or entry '${operand}'`);
                        const found = Object.values(this.#commands).find((commandOptions) => (0, fastest_levenshtein_1.distance)(operand, commandOptions.rawName) < 3);
                        if (found) {
                            this.logger.error(`Did you mean '${found.rawName}' (alias '${Array.isArray(found.alias) ? found.alias.join(", ") : found.alias}')?`);
                        }
                        this.logger.error("Run 'webpack --help' to see available commands and options");
                        process.exit(2);
                    }
                }
            }
            if (!command) {
                throw new Error(`Internal error: Registered command "${operand}" is missing an action handler.`);
            }
            await command.parseAsync([...commandOperands, ...unknown], { from: "user" });
        });
        await this.program.parseAsync(args, parseOptions);
    }
    async loadConfig(options) {
        const disableInterpret = typeof options.disableInterpret !== "undefined" && options.disableInterpret;
        const loadConfigByPath = async (configPath, argv = { env: {} }) => {
            let options;
            const isFileURL = configPath.startsWith("file://");
            try {
                let loadingError;
                try {
                    options = // eslint-disable-next-line no-eval
                        (await eval(`import("${isFileURL ? configPath : (0, node_url_1.pathToFileURL)(configPath)}")`)).default;
                }
                catch (err) {
                    if (this.isValidationError(err) || process.env?.WEBPACK_CLI_FORCE_LOAD_ESM_CONFIG) {
                        throw err;
                    }
                    loadingError = err;
                }
                // Fallback logic when we can't use `import(...)`
                if (loadingError) {
                    const { jsVariants, extensions } = await import("interpret");
                    const ext = node_path_1.default.extname(configPath).toLowerCase();
                    let interpreted = Object.keys(jsVariants).find((variant) => variant === ext);
                    if (!interpreted && ext.endsWith(".cts")) {
                        interpreted = jsVariants[".ts"];
                    }
                    if (interpreted && !disableInterpret) {
                        const rechoir = (await import("rechoir")).default;
                        try {
                            rechoir.prepare(extensions, configPath);
                        }
                        catch (error) {
                            if (error?.failures) {
                                this.logger.error(`Unable load '${configPath}'`);
                                this.logger.error(error.message);
                                for (const failure of error.failures) {
                                    this.logger.error(failure.error.message);
                                }
                                this.logger.error("Please install one of them");
                                process.exit(2);
                            }
                            this.logger.error(error);
                            process.exit(2);
                        }
                    }
                    try {
                        options = require(isFileURL ? (0, node_url_1.fileURLToPath)(configPath) : node_path_1.default.resolve(configPath));
                    }
                    catch (err) {
                        if (this.isValidationError(err)) {
                            throw err;
                        }
                        throw new ConfigurationLoadingError([loadingError, err]);
                    }
                }
                // To handle `babel`/`module.exports.default = {};`
                if (options && typeof options === "object" && "default" in options) {
                    options = options.default;
                }
                if (!options) {
                    this.logger.warn(`Default export is missing or nullish at (from ${configPath}). Webpack will run with an empty configuration. Please double-check that this is what you want. If you want to run webpack with an empty config, \`export {}\`/\`module.exports = {};\` to remove this warning.`);
                    options = {};
                }
            }
            catch (error) {
                if (error instanceof ConfigurationLoadingError) {
                    this.logger.error(`Failed to load '${configPath}' config\n${error.message}`);
                }
                else {
                    this.logger.error(`Failed to load '${configPath}' config`);
                    this.logger.error(error);
                }
                process.exit(2);
            }
            if (Array.isArray(options)) {
                const optionsArray = options;
                await Promise.all(optionsArray.map(async (_, i) => {
                    if (this.isPromise(optionsArray[i])) {
                        optionsArray[i] = await optionsArray[i];
                    }
                    // `Promise` may return `Function`
                    if (this.isFunction(optionsArray[i])) {
                        // when config is a function, pass the env from args to the config function
                        optionsArray[i] = await optionsArray[i](argv.env, argv);
                    }
                }));
                options = optionsArray;
            }
            else {
                if (this.isPromise(options)) {
                    options = await options;
                }
                // `Promise` may return `Function`
                if (this.isFunction(options)) {
                    // when config is a function, pass the env from args to the config function
                    options = await options(argv.env, argv);
                }
            }
            const isObject = (value) => typeof value === "object" && value !== null;
            if (!isObject(options) && !Array.isArray(options)) {
                this.logger.error(`Invalid configuration in '${configPath}'`);
                process.exit(2);
            }
            return {
                options: options,
                path: configPath,
            };
        };
        const config = {
            options: {},
            path: new WeakMap(),
        };
        if (options.config && options.config.length > 0) {
            const loadedConfigs = await Promise.all(options.config.map((configPath) => loadConfigByPath(configPath, options.argv)));
            if (loadedConfigs.length === 1) {
                config.options = loadedConfigs[0].options;
                config.path.set(loadedConfigs[0].options, [loadedConfigs[0].path]);
            }
            else {
                config.options = [];
                for (const loadedConfig of loadedConfigs) {
                    if (Array.isArray(loadedConfig.options)) {
                        for (const item of loadedConfig.options) {
                            config.options.push(item);
                            config.path.set(options, [loadedConfig.path]);
                        }
                    }
                    else {
                        config.options.push(loadedConfig.options);
                        config.path.set(loadedConfig.options, [loadedConfig.path]);
                    }
                }
            }
        }
        else {
            const interpret = await import("interpret");
            // Prioritize popular extensions first to avoid unnecessary fs calls
            const extensions = new Set([
                ".js",
                ".mjs",
                ".cjs",
                ".ts",
                ".cts",
                ".mts",
                ...Object.keys(interpret.extensions),
            ]);
            // Order defines the priority, in decreasing order
            const defaultConfigFiles = new Set(DEFAULT_CONFIGURATION_FILES.flatMap((filename) => [...extensions].map((ext) => node_path_1.default.resolve(filename + ext))));
            let foundDefaultConfigFile;
            for (const defaultConfigFile of defaultConfigFiles) {
                try {
                    await node_fs_1.default.promises.access(defaultConfigFile, node_fs_1.default.constants.F_OK);
                    foundDefaultConfigFile = defaultConfigFile;
                    break;
                }
                catch {
                    continue;
                }
            }
            if (foundDefaultConfigFile) {
                const loadedConfig = await loadConfigByPath(foundDefaultConfigFile, options.argv);
                config.options = loadedConfig.options;
                if (this.isMultipleConfiguration(config.options)) {
                    for (const item of config.options) {
                        config.path.set(item, [loadedConfig.path]);
                    }
                }
                else {
                    config.path.set(loadedConfig.options, [loadedConfig.path]);
                }
            }
        }
        if (options.configName) {
            const notFoundConfigNames = [];
            config.options = options.configName.map((configName) => {
                let found;
                if (this.isMultipleConfiguration(config.options)) {
                    found = config.options.find((options) => options.name === configName);
                }
                else {
                    found = config.options.name === configName ? config.options : undefined;
                }
                if (!found) {
                    notFoundConfigNames.push(configName);
                }
                return found;
            });
            if (notFoundConfigNames.length > 0) {
                this.logger.error(notFoundConfigNames
                    .map((configName) => `Configuration with the name "${configName}" was not found.`)
                    .join(" "));
                process.exit(2);
            }
        }
        const resolveExtends = async (config, configPaths, extendsPaths) => {
            delete config.extends;
            const loadedConfigs = await Promise.all(extendsPaths.map((extendsPath) => loadConfigByPath(extendsPath, options.argv)));
            const { merge } = await import("webpack-merge");
            const loadedOptions = loadedConfigs.flatMap((config) => config.options);
            if (loadedOptions.length > 0) {
                const prevPaths = configPaths.get(config);
                const loadedPaths = loadedConfigs.flatMap((config) => config.path);
                if (prevPaths) {
                    const intersection = loadedPaths.filter((element) => prevPaths.includes(element));
                    if (intersection.length > 0) {
                        this.logger.error("Recursive configuration detected, exiting.");
                        process.exit(2);
                    }
                }
                config = merge(...loadedOptions, config);
                if (prevPaths) {
                    configPaths.set(config, [...prevPaths, ...loadedPaths]);
                }
            }
            if (config.extends) {
                const extendsPaths = typeof config.extends === "string" ? [config.extends] : config.extends;
                config = await resolveExtends(config, configPaths, extendsPaths);
            }
            return config;
        };
        // The `extends` param in CLI gets priority over extends in config file
        if (options.extends && options.extends.length > 0) {
            const extendsPaths = options.extends;
            if (this.isMultipleConfiguration(config.options)) {
                config.options = await Promise.all(config.options.map((options) => resolveExtends(options, config.path, extendsPaths)));
            }
            else {
                // load the config from the extends option
                config.options = await resolveExtends(config.options, config.path, extendsPaths);
            }
        }
        // if no extends option is passed, check if the config file has extends
        else if (this.isMultipleConfiguration(config.options) &&
            config.options.some((options) => options.extends)) {
            config.options = await Promise.all(config.options.map((options) => {
                if (options.extends) {
                    return resolveExtends(options, config.path, typeof options.extends === "string" ? [options.extends] : options.extends);
                }
                return options;
            }));
        }
        else if (!this.isMultipleConfiguration(config.options) && config.options.extends) {
            config.options = await resolveExtends(config.options, config.path, typeof config.options.extends === "string"
                ? [config.options.extends]
                : config.options.extends);
        }
        if (options.merge) {
            const { merge } = await import("webpack-merge");
            // we can only merge when there are multiple configurations
            // either by passing multiple configs by flags or passing a
            // single config exporting an array
            if (!this.isMultipleConfiguration(config.options) || config.options.length <= 1) {
                this.logger.error("At least two configurations are required for merge.");
                process.exit(2);
            }
            const mergedConfigPaths = [];
            config.options = config.options.reduce((accumulator, options) => {
                const configPath = config.path.get(options);
                const mergedOptions = merge(accumulator, options);
                if (configPath) {
                    mergedConfigPaths.push(...configPath);
                }
                return mergedOptions;
            }, {});
            config.path.set(config.options, mergedConfigPaths);
        }
        if (options.analyze && !(await this.isPackageInstalled("webpack-bundle-analyzer"))) {
            await this.installPackage("webpack-bundle-analyzer", {
                preMessage: () => {
                    this.logger.error(`It looks like ${this.colors.yellow("webpack-bundle-analyzer")} is not installed.`);
                },
            });
            this.logger.success(`${this.colors.yellow("webpack-bundle-analyzer")} was installed successfully.`);
        }
        if (typeof options.progress === "string" && options.progress !== "profile") {
            this.logger.error(`'${options.progress}' is an invalid value for the --progress option. Only 'profile' is allowed.`);
            process.exit(2);
        }
        const { default: CLIPlugin } = (await import("./plugins/cli-plugin.js")).default;
        const builtInOptions = this.schemaToOptions(options.webpack);
        const internalBuildConfig = (configuration) => {
            const originalWatchValue = configuration.watch;
            // Apply options
            const args = {};
            const values = {};
            for (const name of Object.keys(options)) {
                if (name === "argv")
                    continue;
                const kebabName = this.toKebabCase(name);
                const arg = builtInOptions.find((item) => item.name === kebabName);
                if (arg) {
                    args[name] = arg;
                    // We really don't know what the value is
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    values[name] = options[name];
                }
            }
            if (Object.keys(values).length > 0) {
                this.#processArguments(options.webpack, args, configuration, values);
            }
            // Output warnings
            if (!Object.isExtensible(configuration)) {
                return;
            }
            if (options.isWatchingLikeCommand &&
                options.argv?.env &&
                (typeof originalWatchValue !== "undefined" || typeof options.argv?.watch !== "undefined")) {
                this.logger.warn(`No need to use the '${options.argv.env.WEBPACK_WATCH ? "watch" : "serve"}' command together with '{ watch: true | false }' or '--watch'/'--no-watch' configuration, it does not make sense.`);
                if (options.argv.env.WEBPACK_SERVE) {
                    configuration.watch = false;
                }
            }
            const isFileSystemCacheOptions = (config) => typeof config.cache !== "undefined" &&
                typeof config.cache !== "boolean" &&
                config.cache.type === "filesystem";
            // Setup default cache options
            if (isFileSystemCacheOptions(configuration) && Object.isExtensible(configuration.cache)) {
                const configPath = config.path.get(configuration);
                if (configPath) {
                    if (!configuration.cache.buildDependencies) {
                        configuration.cache.buildDependencies = {};
                    }
                    if (!configuration.cache.buildDependencies.defaultConfig) {
                        configuration.cache.buildDependencies.defaultConfig = [];
                    }
                    const normalizeConfigPath = (configPath) => configPath.startsWith("file://") ? (0, node_url_1.fileURLToPath)(configPath) : node_path_1.default.resolve(configPath);
                    if (Array.isArray(configPath)) {
                        for (const oneOfConfigPath of configPath) {
                            configuration.cache.buildDependencies.defaultConfig.push(normalizeConfigPath(oneOfConfigPath));
                        }
                    }
                    else {
                        configuration.cache.buildDependencies.defaultConfig.push(
                        // TODO fix `file:` support on webpack side and remove it in the next major release
                        normalizeConfigPath(configPath));
                    }
                }
            }
            // Respect `process.env.NODE_ENV`
            if (!configuration.mode &&
                process.env?.NODE_ENV &&
                (process.env.NODE_ENV === "development" ||
                    process.env.NODE_ENV === "production" ||
                    process.env.NODE_ENV === "none")) {
                configuration.mode = process.env.NODE_ENV;
            }
            // Setup stats
            if (typeof configuration.stats === "undefined") {
                configuration.stats = { preset: "normal" };
            }
            else if (typeof configuration.stats === "boolean") {
                configuration.stats = configuration.stats ? { preset: "normal" } : { preset: "none" };
            }
            else if (typeof configuration.stats === "string") {
                configuration.stats = { preset: configuration.stats };
            }
            let colors;
            // From arguments
            if (typeof this.#isColorSupportChanged !== "undefined") {
                colors = Boolean(this.#isColorSupportChanged);
            }
            // From stats
            else if (typeof configuration.stats.colors !== "undefined") {
                colors = configuration.stats.colors;
            }
            // Default
            else {
                colors = Boolean(this.colors.isColorSupported);
            }
            if (Object.isExtensible(configuration.stats)) {
                configuration.stats.colors = colors;
            }
            // Apply CLI plugin
            if (!configuration.plugins) {
                configuration.plugins = [];
            }
            if (Object.isExtensible(configuration.plugins)) {
                configuration.plugins.unshift(new CLIPlugin({
                    configPath: config.path.get(configuration),
                    helpfulOutput: !options.json,
                    progress: options.progress,
                    analyze: options.analyze,
                    isMultiCompiler: this.isMultipleConfiguration(config.options),
                }));
            }
        };
        if (this.isMultipleConfiguration(config.options)) {
            for (const item of config.options) {
                internalBuildConfig(item);
            }
        }
        else {
            internalBuildConfig(config.options);
        }
        return config;
    }
    async createCompiler(options, callback) {
        const { webpack } = options;
        if (typeof options.configNodeEnv === "string") {
            process.env.NODE_ENV = options.configNodeEnv;
        }
        const config = await this.loadConfig(options);
        let compiler;
        try {
            compiler = callback
                ? webpack(config.options, (error, stats) => {
                    if (error && this.isValidationError(error)) {
                        this.logger.error(error.message);
                        process.exit(2);
                    }
                    callback(error, stats);
                })
                : webpack(config.options);
        }
        catch (error) {
            if (this.isValidationError(error)) {
                this.logger.error(error.message);
            }
            else {
                this.logger.error(error);
            }
            process.exit(2);
        }
        return compiler;
    }
    #needWatchStdin(compiler) {
        if (this.isMultipleCompiler(compiler)) {
            return Boolean(compiler.compilers.some((compiler) => compiler.options.watchOptions?.stdin));
        }
        return Boolean(compiler.options.watchOptions?.stdin);
    }
    async runWebpack(options, isWatchCommand) {
        let compiler;
        let stringifyChunked;
        let Readable;
        if (options.json) {
            ({ stringifyChunked } = await import("@discoveryjs/json-ext"));
            ({ Readable } = await import("node:stream"));
        }
        const callback = (error, stats) => {
            if (error) {
                this.logger.error(error);
                process.exit(2);
            }
            if (stats && (stats.hasErrors() || (options.failOnWarnings && stats.hasWarnings()))) {
                process.exitCode = 1;
            }
            if (!compiler || !stats) {
                return;
            }
            const statsOptions = this.isMultipleCompiler(compiler)
                ? {
                    children: compiler.compilers.map((compiler) => compiler.options.stats),
                }
                : compiler.options.stats;
            if (options.json) {
                const handleWriteError = (error) => {
                    this.logger.error(error);
                    process.exit(2);
                };
                if (options.json === true) {
                    Readable.from(stringifyChunked(stats.toJson(statsOptions)))
                        .on("error", handleWriteError)
                        .pipe(process.stdout)
                        .on("error", handleWriteError)
                        .on("close", () => process.stdout.write("\n"));
                }
                else {
                    Readable.from(stringifyChunked(stats.toJson(statsOptions)))
                        .on("error", handleWriteError)
                        .pipe(node_fs_1.default.createWriteStream(options.json))
                        .on("error", handleWriteError)
                        // Use stderr to logging
                        .on("close", () => {
                        process.stderr.write(`[webpack-cli] ${this.colors.green(`stats are successfully stored as json to ${options.json}`)}\n`);
                    });
                }
            }
            else {
                const printedStats = stats.toString(statsOptions);
                // Avoid extra empty line when `stats: 'none'`
                if (printedStats) {
                    this.logger.raw(printedStats);
                }
            }
        };
        const env = isWatchCommand || options.watch
            ? { WEBPACK_WATCH: true, ...options.env }
            : { WEBPACK_BUNDLE: true, WEBPACK_BUILD: true, ...options.env };
        options.argv = { ...options, env };
        if (isWatchCommand) {
            options.watch = true;
            options.isWatchingLikeCommand = true;
        }
        compiler = await this.createCompiler(options, callback);
        if (!compiler) {
            return;
        }
        const needGracefulShutdown = (compiler) => Boolean(this.isMultipleCompiler(compiler)
            ? compiler.compilers.some((compiler) => compiler.options.watch ||
                (compiler.options.cache && compiler.options.cache.type === "filesystem"))
            : compiler.options.watch ||
                (compiler.options.cache && compiler.options.cache.type === "filesystem"));
        if (needGracefulShutdown(compiler)) {
            let needForceShutdown = false;
            for (const signal of EXIT_SIGNALS) {
                // eslint-disable-next-line @typescript-eslint/no-loop-func
                const listener = () => {
                    if (needForceShutdown) {
                        process.exit(0);
                    }
                    // Output message after delay to avoid extra logging
                    const timeout = setTimeout(() => {
                        this.logger.info("Gracefully shutting down. To force exit, press ^C again. Please wait...");
                    }, 2000);
                    needForceShutdown = true;
                    compiler.close(() => {
                        clearTimeout(timeout);
                        process.exit(0);
                    });
                };
                process.on(signal, listener);
            }
            if (this.#needWatchStdin(compiler)) {
                process.stdin.on("end", () => {
                    process.exit(0);
                });
                process.stdin.resume();
            }
        }
    }
}
exports.default = WebpackCLI;
