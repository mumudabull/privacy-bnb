const WEI = 10n ** 18n;

export function formatBnb(wei: bigint, fractionDigits = 4): string {
  const negative = wei < 0n;
  const absolute = negative ? -wei : wei;
  const whole = absolute / WEI;
  const fraction = absolute % WEI;
  const digits = fraction.toString().padStart(18, "0").slice(0, fractionDigits);
  const trimmed = digits.replace(/0+$/, "");
  const body = trimmed.length > 0 ? `${whole.toString()}.${trimmed}` : whole.toString();
  return negative ? `-${body}` : body;
}

export function formatInteger(value: bigint | number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

export function shortenHex(value: string, head = 10, tail = 8): string {
  if (value.length <= head + tail + 1) return value;
  return `${value.slice(0, head)}…${value.slice(-tail)}`;
}

export function queueCaughtUp(pendingCount: bigint, pendingHead: bigint): boolean {
  return pendingCount === pendingHead;
}
