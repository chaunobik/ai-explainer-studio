export function arg(name: string): string | undefined {
  const direct = process.argv.find((value) => value.startsWith(`--${name}=`));
  if (direct) return direct.slice(name.length + 3);
  const index = process.argv.indexOf(`--${name}`);
  if (index >= 0) {
    const value = process.argv[index + 1];
    if (value && !value.startsWith("--")) return value;
  }
  return undefined;
}

export function flag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}
