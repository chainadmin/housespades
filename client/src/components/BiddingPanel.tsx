import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface BiddingPanelProps {
  onBid: (bid: number) => void;
  disabled?: boolean;
  partnerBid: number | null;
  maxBid?: number;
}

export function BiddingPanel({ onBid, disabled = false, partnerBid, maxBid = 13 }: BiddingPanelProps) {
  const [selectedBid, setSelectedBid] = useState<number>(3);

  const handleBidChange = (delta: number) => {
    setSelectedBid((prev) => Math.max(0, Math.min(maxBid, prev + delta)));
  };

  const handleConfirm = () => {
    onBid(selectedBid);
  };

  const quickBids = [0, 3, 4, 5];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <Card className="w-72">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg text-center">Place Your Bid</CardTitle>
          {partnerBid !== null && (
            <p className="text-sm text-muted-foreground text-center">
              Partner bid: {partnerBid}
            </p>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Bid selector */}
          <div className="flex items-center justify-center gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={() => handleBidChange(-1)}
              disabled={disabled || selectedBid <= 0}
              data-testid="button-bid-decrease"
            >
              <Minus className="h-4 w-4" />
            </Button>
            
            <div className="w-20 h-16 flex items-center justify-center bg-accent rounded-lg">
              <span className="text-3xl font-bold">{selectedBid}</span>
            </div>
            
            <Button
              variant="outline"
              size="icon"
              onClick={() => handleBidChange(1)}
              disabled={disabled || selectedBid >= maxBid}
              data-testid="button-bid-increase"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {/* Quick bid buttons */}
          <div className="flex justify-center gap-2">
            {quickBids.map((bid) => (
              <Button
                key={bid}
                variant={selectedBid === bid ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedBid(bid)}
                disabled={disabled}
                data-testid={`button-quick-bid-${bid}`}
                className={cn(
                  "w-12",
                  bid === 0 && "text-destructive"
                )}
              >
                {bid === 0 ? "NIL" : bid}
              </Button>
            ))}
          </div>

          {/* Confirm button */}
          <Button
            className="w-full"
            onClick={handleConfirm}
            disabled={disabled}
            data-testid="button-confirm-bid"
          >
            Confirm Bid ({selectedBid})
          </Button>

          {selectedBid === 0 && (
            <p className="text-xs text-center text-muted-foreground">
              Nil bid: +100 if successful, -100 if you take any books
            </p>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
