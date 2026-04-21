"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";

import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Spinner } from "~/components/ui/spinner";
import { Textarea } from "~/components/ui/textarea";
import { api } from "~/trpc/react";

type Props = {
  wordId: string;
  userAnswer: string;
  currentEnglish: string;
  currentMeaning: string;
  onUpdated?: (next: { english: string; meaning: string }) => void;
};

type ReviewResult = {
  isValid: boolean;
  feedback: string;
  suggestedEnglish: string;
  suggestedMeaning: string;
};

export function MeaningReviewButton({
  wordId,
  userAnswer,
  currentEnglish,
  currentMeaning,
  onUpdated,
}: Props) {
  const utils = api.useUtils();
  const [result, setResult] = useState<ReviewResult | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [draftEnglish, setDraftEnglish] = useState("");
  const [draftMeaning, setDraftMeaning] = useState("");

  const reviewMutation = api.vocab.reviewMeaning.useMutation({
    onSuccess: (data) => {
      setResult({
        isValid: data.isValid,
        feedback: data.feedback,
        suggestedEnglish: data.suggestedEnglish,
        suggestedMeaning: data.suggestedMeaning,
      });
    },
    onError: (err) => toast.error(err.message),
  });

  const updateMutation = api.vocab.updateDefinition.useMutation({
    onSuccess: () => {
      toast.success("Definition updated");
      void utils.vocab.list.invalidate();
      void utils.vocab.count.invalidate();
      onUpdated?.({ english: draftEnglish, meaning: draftMeaning });
      setDialogOpen(false);
    },
    onError: (err) => toast.error(err.message),
  });

  const hasUserAnswer = userAnswer.trim().length > 0;

  const openDialog = () => {
    if (!result) return;
    setDraftEnglish(result.suggestedEnglish || currentEnglish);
    setDraftMeaning(result.suggestedMeaning || currentMeaning);
    setDialogOpen(true);
  };

  const save = () => {
    const english = draftEnglish.trim();
    if (!english) {
      toast.error("English cannot be empty");
      return;
    }
    updateMutation.mutate({
      id: wordId,
      english,
      meaning: draftMeaning.trim(),
    });
  };

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="outline"
        disabled={!hasUserAnswer || reviewMutation.isPending}
        onClick={() =>
          reviewMutation.mutate({ id: wordId, userAnswer: userAnswer.trim() })
        }
        className="w-full rounded-[12px] py-3 text-sm font-semibold"
      >
        {reviewMutation.isPending ? (
          <>
            <Spinner className="size-4" />
            Reviewing…
          </>
        ) : (
          <>
            <Sparkles className="size-4" />
            {result ? "Review again" : "Review with AI"}
          </>
        )}
      </Button>

      {result && (
        <Card className="rounded-[12px] p-0 shadow-(--shadow-sm-app) ring-0">
          <CardContent className="space-y-2 px-4 py-3">
            <div className="text-text3 text-[10px] font-bold tracking-[1.5px] uppercase">
              AI Review
            </div>
            <p className="text-sm">{result.feedback}</p>
            {result.isValid && (
              <Button
                type="button"
                variant="secondary"
                onClick={openDialog}
                className="w-full rounded-[10px] py-2 text-xs font-semibold"
              >
                Update definition
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Update definition</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <DefinitionField
              label="Short gloss"
              hint="1-3 words shown on the flashcard"
              currentValue={currentEnglish}
              changed={draftEnglish.trim() !== currentEnglish.trim()}
            >
              <Input
                value={draftEnglish}
                onChange={(e) => setDraftEnglish(e.target.value)}
                placeholder="e.g. every day"
                autoCapitalize="off"
                spellCheck={false}
              />
            </DefinitionField>

            <DefinitionField
              label="Extended definition"
              hint="Longer explanation with synonyms or nuance"
              currentValue={currentMeaning}
              changed={draftMeaning.trim() !== currentMeaning.trim()}
            >
              <Textarea
                value={draftMeaning}
                onChange={(e) => setDraftMeaning(e.target.value)}
                placeholder="e.g. every day, daily; used in informal contexts"
                rows={3}
              />
            </DefinitionField>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={updateMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={save}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? (
                <>
                  <Spinner className="size-4" />
                  Saving…
                </>
              ) : (
                "Save"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DefinitionField({
  label,
  hint,
  currentValue,
  changed,
  children,
}: {
  label: string;
  hint: string;
  currentValue: string;
  changed: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <label className="text-text3 text-[10px] font-bold tracking-[1.5px] uppercase">
          {label}
        </label>
        {changed && (
          <span className="bg-jade-soft text-jade rounded-full px-2 py-0.5 text-[9px] font-bold tracking-[0.5px] uppercase">
            Changed
          </span>
        )}
      </div>
      <p className="text-text3 text-[11px]">{hint}</p>
      <div className="text-text3 text-xs">
        <span className="mr-1 font-semibold">Current:</span>
        <span>
          {currentValue || <em className="text-text3">(empty)</em>}
        </span>
      </div>
      {children}
    </div>
  );
}
