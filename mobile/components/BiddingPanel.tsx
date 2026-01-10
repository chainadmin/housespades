import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useColors } from '@/hooks/useColorScheme';

interface BiddingPanelProps {
  onBid: (bid: number) => void;
  isMyTurn: boolean;
  partnerBid: number | null;
  teamCurrentBid: number;
}

export function BiddingPanel({ onBid, isMyTurn, partnerBid, teamCurrentBid }: BiddingPanelProps) {
  const colors = useColors();
  const [selectedBid, setSelectedBid] = useState<number | null>(null);

  if (!isMyTurn) return null;

  const handleConfirmBid = () => {
    if (selectedBid !== null) {
      onBid(selectedBid);
      setSelectedBid(null);
    }
  };

  const bidOptions = Array.from({ length: 14 }, (_, i) => i);

  return (
    <View style={[styles.container, { backgroundColor: colors.card }]}>
      <Text style={[styles.title, { color: colors.text }]}>Your Bid</Text>
      
      {partnerBid !== null && (
        <Text style={[styles.partnerBid, { color: colors.textSecondary }]}>
          Partner bid: {partnerBid} | Team total: {teamCurrentBid + (selectedBid || 0)}
        </Text>
      )}

      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.bidsContainer}
      >
        {bidOptions.map((bid) => (
          <TouchableOpacity
            key={bid}
            style={[
              styles.bidButton,
              { backgroundColor: colors.surface, borderColor: colors.border },
              selectedBid === bid && { backgroundColor: colors.primary, borderColor: colors.primary },
            ]}
            onPress={() => setSelectedBid(bid)}
          >
            <Text
              style={[
                styles.bidText,
                { color: colors.text },
                selectedBid === bid && { color: colors.primaryForeground },
              ]}
            >
              {bid === 0 ? 'Nil' : bid}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <TouchableOpacity
        style={[
          styles.confirmButton,
          { backgroundColor: selectedBid !== null ? colors.primary : colors.border },
        ]}
        onPress={handleConfirmBid}
        disabled={selectedBid === null}
      >
        <Text style={[styles.confirmText, { color: colors.primaryForeground }]}>
          Confirm Bid
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  partnerBid: {
    fontSize: 14,
  },
  bidsContainer: {
    gap: 8,
    paddingHorizontal: 4,
  },
  bidButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    marginHorizontal: 2,
  },
  bidText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  confirmButton: {
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 24,
    marginTop: 8,
  },
  confirmText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});
