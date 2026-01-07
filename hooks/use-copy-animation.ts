import { useState, useCallback } from "react";
import { toast } from "sonner";

export function useCopyAnimation() {
  const [isCopying, setIsCopying] = useState(false);

  const triggerCopyAnimation = useCallback(() => {
    setIsCopying(true);
    setTimeout(() => setIsCopying(false), 300);
  }, []);

  const copyWithAnimation = useCallback(
    async (text: string) => {
      try {
        await navigator.clipboard.writeText(text);
        triggerCopyAnimation();
        toast.success("Copied successfully!");
      } catch (err) {
        toast.error("Failed to copy to clipboard");
        console.error(err);
      }
    },
    [triggerCopyAnimation],
  );

  const pasteWithAnimation = useCallback(async (): Promise<string> => {
    try {
      const text = await navigator.clipboard.readText();
      triggerCopyAnimation();
      toast.success("Pasted successfully!");
      return text;
    } catch (err) {
      toast.error("Failed to read from clipboard");
      throw err;
    }
  }, [triggerCopyAnimation]);

  return {
    isCopying,
    triggerCopyAnimation,
    copyWithAnimation,
    pasteWithAnimation,
    copyAnimationClass: isCopying ? "copy-success" : "",
  };
}
