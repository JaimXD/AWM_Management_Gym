import type {
  ClipboardEvent,
  Dispatch,
  SetStateAction,
} from "react";

const emojiPattern =
  /[\p{Extended_Pictographic}\p{Emoji_Presentation}\uFE0F]/gu;

export function removeEmojis(value: string): string {
  return value.replace(emojiPattern, "");
}

export const emailPattern =
  /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function isValidEmail(email: string): boolean {
  return emailPattern.test(email);
}

export function handlePasteWithoutEmojis(
  event: ClipboardEvent<HTMLInputElement>,
  setValue: Dispatch<SetStateAction<string>>
): void {
  const pastedText = event.clipboardData.getData("text");
  const cleanText = removeEmojis(pastedText);

  if (pastedText === cleanText) {
    return;
  }

  event.preventDefault();

  const input = event.currentTarget;
  const start = input.selectionStart ?? input.value.length;
  const end = input.selectionEnd ?? input.value.length;

  const nextValue =
    input.value.slice(0, start) +
    cleanText +
    input.value.slice(end);

  setValue(nextValue);

  requestAnimationFrame(() => {
    const cursorPosition = start + cleanText.length;
    input.setSelectionRange(cursorPosition, cursorPosition);
  });
}