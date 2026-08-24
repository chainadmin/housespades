import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { authenticatedFetch } from '@/lib/auth';
import { useColors } from '@/hooks/useColorScheme';

export default function PrivateRoomScreen() {
  const colors = useColors(); const router = useRouter();
  const { mode = 'ace_high', points = '300' } = useLocalSearchParams<{ mode: string; points: string }>();
  const [joining, setJoining] = useState(false); const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const request = async (path: string, body: object) => {
    setBusy(true); setError('');
    try {
      const response = await authenticatedFetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Unable to open room.');
      router.replace(`/private-room-lobby?roomId=${data.id}`);
    } catch (e: any) { setError(e.message); } finally { setBusy(false); }
  };
  const normalized = code.toUpperCase().replace(/\s/g, '');
  return <SafeAreaView style={[s.page, { backgroundColor: colors.background }]}>
    <TouchableOpacity onPress={() => router.back()} style={s.back}><Ionicons name="arrow-back" size={26} color={colors.text}/></TouchableOpacity>
    <Text style={[s.title, { color: colors.text }]}>Private Room</Text>
    <Text style={[s.copy, { color: colors.textSecondary }]}>Create a private game and share the room code with the people you want to play.</Text>
    {!joining ? <View style={s.actions}>
      <TouchableOpacity disabled={busy} style={[s.button, { backgroundColor: colors.primary }]} onPress={() => request('/api/private-rooms', { gameMode: mode, pointGoal: points })}><Text style={s.buttonText}>Create Room</Text></TouchableOpacity>
      <TouchableOpacity disabled={busy} style={[s.outline, { borderColor: colors.primary }]} onPress={() => setJoining(true)}><Text style={[s.outlineText, { color: colors.primary }]}>Join Room</Text></TouchableOpacity>
    </View> : <View style={s.actions}>
      <Text style={[s.label, { color: colors.text }]}>Enter Room Code</Text>
      <TextInput autoCapitalize="characters" autoCorrect={false} maxLength={6} value={normalized} onChangeText={setCode} placeholder="XXXXX" placeholderTextColor={colors.textSecondary} style={[s.input, { color: colors.text, borderColor: colors.primary }]} />
      <TouchableOpacity disabled={busy || normalized.length < 5} style={[s.button, { backgroundColor: colors.primary, opacity: normalized.length < 5 ? .5 : 1 }]} onPress={() => request('/api/private-rooms/join', { code: normalized })}><Text style={s.buttonText}>Join Room</Text></TouchableOpacity>
    </View>}
    {busy && <ActivityIndicator color={colors.primary}/>} {!!error && <Text style={s.error}>{error}</Text>}
  </SafeAreaView>;
}
const s = StyleSheet.create({ page:{flex:1,padding:24},back:{width:44,height:44,justifyContent:'center'},title:{fontSize:32,fontWeight:'800',marginTop:24},copy:{fontSize:16,lineHeight:23,marginTop:12},actions:{marginTop:42,gap:16},button:{height:58,borderRadius:14,alignItems:'center',justifyContent:'center'},buttonText:{color:'white',fontSize:18,fontWeight:'700'},outline:{height:58,borderRadius:14,borderWidth:2,alignItems:'center',justifyContent:'center'},outlineText:{fontSize:18,fontWeight:'700'},label:{fontSize:20,fontWeight:'700'},input:{height:64,borderWidth:2,borderRadius:14,textAlign:'center',fontSize:28,fontWeight:'800',letterSpacing:8},error:{color:'#dc2626',textAlign:'center',marginTop:18,fontSize:15} });
