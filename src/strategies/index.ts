import { Strategy } from "../interfaces/strategy";

const fs = require("fs");
const path = require("path");

const basename = path.basename(module.filename);

export class Strategies {
  static strategies: Strategy[] = fs
    .readdirSync(__dirname)
    .filter(
      (file: string) =>
        file.indexOf(".") !== 0 && file !== basename && file.slice(-3) === ".js"
    )
    .map(
      (file: string) => new (require(path.join(__dirname, file)).default)()
    ) as Strategy[];

  static getStrategyByUrl(url: string): Strategy | undefined {
    return this.strategies.find(
      (strategy: Strategy) =>
        strategy.shorteners.some((shortener: RegExp) => shortener.test(url)) ||
        strategy.urls.some((urlRegex: RegExp) => urlRegex.test(url))
    );
  }

  static getAllRegEx() {
    return this.strategies.flatMap((strategy: Strategy) => [
      ...strategy.urls,
      ...strategy.shorteners,
    ]);
  }

  static isShortener(url: string): boolean {
    return this.strategies.some((strategy: Strategy) =>
      strategy.shorteners.some((shortener: RegExp) => shortener.test(url))
    );
  }
}
