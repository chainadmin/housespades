import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Clipboard, Share, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { authenticatedFetch, getStoredUser, type User } from '@/lib/auth';
import { useColors } from '@/hooks/useColorScheme';
import { useWebSocket } from '@/hooks/useWebSocket';

type RoomPlayer = { id:number; userId:number|null; username:string|null; displayName:string|null; seatNumber:number; team:number; ready:boolean; isHost:boolean; isBot:boolean };
type Room = { id:string; roomCode:string; status:string; hostUserId:number; botFillEnabled:boolean; gameSessionId?:string; players:RoomPlayer[] };

export default function PrivateRoomLobbyScreen() {
  const { roomId } = useLocalSearchParams<{ roomId:string }>(); const router = useRouter(); const colors = useColors();
  const [room,setRoom]=useState<Room|null>(null); const [user,setUser]=useState<User|null>(null); const [error,setError]=useState(''); const [busy,setBusy]=useState(false);
  useWebSocket({ autoConnect:true, userId:user?.id, onMatchFound:(gameId)=>router.replace(`/game?type=online&gameId=${gameId}`) });
  const load=useCallback(async()=>{try{const r=await authenticatedFetch(`/api/private-rooms/${roomId}`);const d=await r.json();if(!r.ok)throw new Error(d.error);setRoom(d);if(d.status==='in_game'&&d.gameSessionId)router.replace(`/game?type=online&gameId=${d.gameSessionId}`);}catch(e:any){setError(e.message);}},[roomId]);
  useEffect(()=>{getStoredUser().then(setUser);load();const timer=setInterval(load,1500);return()=>clearInterval(timer);},[load]);
  const post=async(path:string,body:object={})=>{setBusy(true);setError('');try{const r=await authenticatedFetch(`/api/private-rooms/${roomId}/${path}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});if(r.status===204)return;const d=await r.json();if(!r.ok)throw new Error(d.error);if(d.gameSessionId)router.replace(`/game?type=online&gameId=${d.gameSessionId}`);else setRoom(d);}catch(e:any){setError(e.message);}finally{setBusy(false);}};
  if(!room)return <SafeAreaView style={[s.page,{backgroundColor:colors.background}]}><ActivityIndicator color={colors.primary}/><Text style={s.error}>{error}</Text></SafeAreaView>;
  const host=room.hostUserId===user?.id; const me=room.players.find(p=>p.userId===user?.id);
  const autoAssign=()=>post('settings',{teams:room.players.map((p,i)=>({playerId:p.id,team:i%2===0?1:2}))});
  const leave=async()=>{await post(host?'close':'leave');router.replace('/');};
  return <SafeAreaView style={[s.page,{backgroundColor:colors.background}]}>
    <View style={s.header}><Text style={[s.eyebrow,{color:colors.primary}]}>PRIVATE ROOM</Text><TouchableOpacity onPress={leave}><Ionicons name="close" size={28} color={colors.text}/></TouchableOpacity></View>
    <Text style={[s.codeLabel,{color:colors.textSecondary}]}>Room Code</Text><Text style={[s.code,{color:colors.text}]}>{room.roomCode}</Text>
    <View style={s.shareRow}><TouchableOpacity style={[s.smallButton,{borderColor:colors.primary}]} onPress={()=>{Clipboard.setString(room.roomCode);Alert.alert('Copied','Room code copied.');}}><Text style={{color:colors.primary,fontWeight:'700'}}>Copy Code</Text></TouchableOpacity><TouchableOpacity style={[s.smallButton,{borderColor:colors.primary}]} onPress={()=>Share.share({message:`Join my House Spades game.\n\nRoom Code: ${room.roomCode}`})}><Text style={{color:colors.primary,fontWeight:'700'}}>Share Code</Text></TouchableOpacity></View>
    <Text style={[s.section,{color:colors.text}]}>PLAYERS</Text>
    {[1,2,3,4].map(seat=>{const p=room.players.find(x=>x.seatNumber===seat);return <View key={seat} style={[s.player,{borderColor:colors.border}]}><View><Text style={[s.playerName,{color:p?colors.text:colors.textSecondary}]}>{seat}. {p?(p.displayName||p.username):'Waiting…'}</Text>{p&&<Text style={{color:colors.textSecondary}}>Team {p.team} · {p.isHost?'Host':p.ready?'Ready':'Not Ready'}</Text>}</View>{host&&p&&!p.isHost&&<TouchableOpacity onPress={()=>post('kick',{playerId:p.id})}><Ionicons name="remove-circle-outline" size={24} color="#dc2626"/></TouchableOpacity>}</View>})}
    {host?<><View style={s.setting}><Text style={[s.settingText,{color:colors.text}]}>Fill Empty Seats With Bots</Text><Switch value={room.botFillEnabled} onValueChange={v=>post('settings',{botFillEnabled:v})}/></View><TouchableOpacity style={[s.smallButton,{borderColor:colors.primary,alignSelf:'stretch'}]} onPress={autoAssign}><Text style={{color:colors.primary,fontWeight:'700'}}>Auto Assign Teams</Text></TouchableOpacity><TouchableOpacity disabled={busy} style={[s.start,{backgroundColor:colors.primary}]} onPress={()=>post('start')}><Text style={s.startText}>Start Game</Text></TouchableOpacity></>:me&&!me.isHost&&<TouchableOpacity style={[s.start,{backgroundColor:colors.primary}]} onPress={()=>post('ready',{ready:!me.ready})}><Text style={s.startText}>{me.ready?'Not Ready':'Ready'}</Text></TouchableOpacity>}
    {!!error&&<Text style={s.error}>{error}</Text>}{busy&&<ActivityIndicator color={colors.primary}/>}<Text style={[s.note,{color:colors.textSecondary}]}>The host transfers to the longest-connected player if the host leaves the lobby.</Text>
  </SafeAreaView>;
}
const s=StyleSheet.create({page:{flex:1,padding:22},header:{flexDirection:'row',justifyContent:'space-between',alignItems:'center'},eyebrow:{fontSize:16,fontWeight:'800',letterSpacing:2},codeLabel:{textAlign:'center',marginTop:18},code:{textAlign:'center',fontSize:38,fontWeight:'900',letterSpacing:9},shareRow:{flexDirection:'row',gap:12,marginTop:12},smallButton:{flex:1,minHeight:44,borderWidth:1.5,borderRadius:12,alignItems:'center',justifyContent:'center'},section:{fontWeight:'800',fontSize:18,marginTop:28,marginBottom:8},player:{minHeight:58,borderBottomWidth:1,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},playerName:{fontSize:16,fontWeight:'600'},setting:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginVertical:18},settingText:{fontSize:16,fontWeight:'600',flex:1},start:{height:54,borderRadius:14,alignItems:'center',justifyContent:'center',marginTop:16},startText:{color:'white',fontSize:18,fontWeight:'800'},error:{color:'#dc2626',textAlign:'center',marginTop:12},note:{fontSize:12,lineHeight:17,textAlign:'center',marginTop:14}});
