import * as React from "react";
import { cn } from "@/lib/utils";

interface ClickableStepperProps {
  currentStep: number;
  totalSteps: number;
  steps: string[];
  onStepClick?: (stepNumber: number) => void;
  className?: string;
}

export function ClickableStepper({
  currentStep,
  totalSteps,
  steps,
  onStepClick,
  className,
}: ClickableStepperProps) {
  return (
    <div className={cn("w-full", className)}>
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const stepNumber = index + 1;
          const isActive = stepNumber === currentStep;
          const isCompleted = stepNumber < currentStep;
          const isUpcoming = stepNumber > currentStep;
          const isClickable = !!onStepClick;

          return (
            <div key={index} className="flex flex-col items-center">
              <div
                className={cn(
                  "flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium border-2 transition-colors",
                  isActive &&
                    "bg-primary text-primary-foreground border-primary",
                  isCompleted && "bg-green-500 text-white border-green-500",
                  isUpcoming && "bg-muted text-muted-foreground border-muted",
                  isClickable &&
                    "cursor-pointer hover:scale-105 transition-transform"
                )}
                onClick={() => isClickable && onStepClick(stepNumber)}
              >
                {isCompleted ? (
                  <svg
                    className="w-4 h-4"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                ) : (
                  stepNumber
                )}
              </div>
              <span
                className={cn(
                  "mt-2 text-xs text-center max-w-20",
                  isActive && "text-primary font-medium",
                  isCompleted && "text-green-600 font-medium",
                  isUpcoming && "text-muted-foreground",
                  isClickable &&
                    "cursor-pointer hover:text-primary transition-colors"
                )}
                onClick={() => isClickable && onStepClick(stepNumber)}
              >
                {step}
              </span>
            </div>
          );
        })}
      </div>

      {/* Progress bar */}
      <div className="mt-4 w-full bg-muted rounded-full h-1">
        <div
          className="bg-primary h-1 rounded-full transition-all duration-300"
          style={{
            width: `${((currentStep - 1) / (totalSteps - 1)) * 100}%`,
          }}
        />
      </div>
    </div>
  );
}
