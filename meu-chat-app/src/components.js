import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, TextInput, Image, FlatList, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { styles, THEME } from './styles';
import { socket } from './config';

export const ButtonPrimary = ({ texto, onPress, style, disabled }) => (
    <TouchableOpacity style={[styles.btnPrimary, style, disabled && {opacity: 0.6}]} onPress={onPress} disabled={disabled}>
        <Text style={styles.txtBtnPrimary}>{texto}</Text>
    </TouchableOpacity>
);

export const InputModerno = ({ placeholder, value, onChangeText, multiline, keyboardType, maxLength, icon, secureTextEntry }) => (
    <View style={styles.inputContainer}>
        {icon && <Ionicons name={icon} size={20} color={THEME.textSec} style={{marginRight:10}} />}
        <TextInput 
            style={[styles.inputField, multiline && {height: 80, textAlignVertical:'top'}]}
            placeholder={placeholder} placeholderTextColor="#999" value={value} onChangeText={onChangeText}
            multiline={multiline} keyboardType={keyboardType} maxLength={maxLength} secureTextEntry={secureTextEntry}
        />
    </View>
);

export const Badge = ({ tipo }) => {
    let cor = '#999', icon = 'help', texto = '';
    if (tipo === 'admin') { cor = '#d32f2f'; icon = 'shield'; texto = 'ADMIN'; }
    if (tipo === 'verificado') { cor = '#0095F6'; icon = 'checkmark-circle'; texto = 'VERIFICADO'; }
    if (tipo === 'premium') { cor = '#FFD700'; icon = 'star'; texto = 'PREMIUM'; }

    return (
        <View style={{flexDirection:'row', alignItems:'center', backgroundColor:cor, paddingHorizontal:6, paddingVertical:2, borderRadius:4, marginLeft:5}}>
            <Ionicons name={icon} size={10} color="white" style={{marginRight:2}} />
            <Text style={{color:'white', fontSize:10, fontWeight:'bold'}}>{texto}</Text>
        </View>
    );
};

export const ContactCard = ({ item, onPress }) => (
    <TouchableOpacity style={styles.cardContact} onPress={onPress}>
        <View style={styles.avatarContainer}>
            <Image source={item.fotoPrincipal ? {uri:item.fotoPrincipal} : require('../assets/icon.png')} style={styles.avatarImg} />
            <View style={[styles.statusDot, {backgroundColor: item.online ? THEME.secondary : '#ccc'}]} />
        </View>
        <View style={{flex:1}}>
            <View style={{flexDirection:'row', alignItems:'center'}}>
                <Text style={styles.cardTitle}>{item.nome || `@${item.nick}`}</Text>
                {item.verificado && <Ionicons name="checkmark-circle" size={14} color="#0095F6" style={{marginLeft:4}}/>}
                {item.premium && <Ionicons name="star" size={14} color="#FFD700" style={{marginLeft:4}}/>}
            </View>
            <Text style={styles.cardSubtitle}>{item.banido ? 'SUSPENSO' : `@${item.nick} • ${item.idade}`}</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#ccc" />
    </TouchableOpacity>
);

export const ImagemSegura = ({ uri, onZoom, style }) => {
    const [revelada, setRevelada] = useState(false);
    if (revelada) return <TouchableOpacity onPress={onZoom}><Image source={{ uri }} style={style} /></TouchableOpacity>;
    return (
        <TouchableOpacity onPress={() => setRevelada(true)} style={[style, styles.blurContainer]}>
            <Image source={{ uri }} style={[StyleSheet.absoluteFill, { opacity: 0.3 }]} blurRadius={20} />
            <View style={styles.blurOverlay}>
                <Ionicons name="eye-off" size={24} color="white" />
                <Text style={styles.blurText}>Toque para ver</Text>
            </View>
        </TouchableOpacity>
    );
};

export const TelaChat = ({ contato, msgs, onVoltar, onEnviar, onFotoCamera, onFotoGaleria, onZoom, onVerPerfil, onDenunciar, contatoOnline }) => {
  const [txt, setTxt] = useState('');
  const flatListRef = useRef(null);

  useEffect(() => {
     if(msgs.length > 0) {
         const ultimas = msgs.filter(m => m.sender === 'eles' && !m.lido);
         ultimas.forEach(m => socket.emit('marcar_lida', { room: contato.idSala, msgId: m.id }));
     }
  }, [msgs]);
  
  // --- REATIVANDO O SELO ---
  const renderOrigem = (origin) => {
      if(origin === 'camera') return <View style={styles.tagCamera}><Ionicons name="camera" size={10} color="white"/><Text style={styles.txtTag}>Ao Vivo</Text></View>
      if(origin === 'gallery') return <View style={styles.tagGallery}><Ionicons name="image" size={10} color="#666"/><Text style={[styles.txtTag, {color:'#666'}]}>Galeria</Text></View>
      return null;
  };

  return (
    <View style={{flex:1, backgroundColor:'#EFEFF4'}}>
      <View style={styles.headerChat}>
         <TouchableOpacity onPress={onVoltar} style={{padding:8}}><Ionicons name="arrow-back" size={24} color={THEME.primary} /></TouchableOpacity>
         
         {/* CLIQUE PARA VER PERFIL */}
         <TouchableOpacity style={{flex:1, flexDirection:'row', alignItems:'center', marginLeft:10}} onPress={onVerPerfil}>
            <Image source={contato.fotoPrincipal ? {uri: contato.fotoPrincipal} : require('../assets/icon.png')} style={{width:40, height:40, borderRadius:15, marginRight:10}} />
            <View>
                <Text style={{fontWeight:'bold', fontSize:16}}>{contato.nome}</Text>
                <Text style={{fontSize:11, color: THEME.textSec}}>
                    {contato.banido ? 'SUSPENSO' : (contatoOnline ? 'Online' : 'Offline')}
                    <View style={{width:8, height:8, borderRadius:4, marginLeft:5, backgroundColor: contatoOnline ? THEME.secondary : '#ccc'}} />
                </Text>
            </View>
         </TouchableOpacity>
         
         <TouchableOpacity onPress={onDenunciar} style={{padding:8}}><Ionicons name="warning" size={20} color={THEME.danger} /></TouchableOpacity>
      </View>

      <FlatList
        ref={flatListRef} 
        data={msgs} 
        keyExtractor={item => item.id}
        inverted // LISTA INVERTIDA
        contentContainerStyle={{paddingVertical: 15}}
        renderItem={({item}) => {
           const isEu = item.sender === 'eu';
           return (
             <View style={[styles.msgRow, isEu ? {justifyContent:'flex-end'} : {justifyContent:'flex-start'}]}>
               <View style={[styles.bubble, isEu ? styles.bubbleEu : styles.bubbleEles]}>
                 {item.type === 'image' ? (
                     <View>
                        {isEu ? <TouchableOpacity onPress={() => onZoom(item)}><Image source={{uri: item.content}} style={styles.imgChat} /></TouchableOpacity> 
                              : <ImagemSegura uri={item.content} style={styles.imgChat} onZoom={() => onZoom(item)} />}
                         
                         {/* CHAMANDO O SELO AQUI */}
                         {renderOrigem(item.origin)}
                     </View>
                 ) : <Text style={[styles.msgText, isEu ? {color:'white'} : {color: THEME.text}]}>{item.content}</Text>}
                 
                 <View style={styles.msgMeta}>
                     <Text style={[styles.msgTime, isEu ? {color:'rgba(255,255,255,0.7)'} : {color:'#999'}]}>
                        {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                     </Text>
                     {isEu && <Ionicons name={item.lido?"checkmark-done":"checkmark"} size={14} color={item.lido?"#fff":"rgba(255,255,255,0.6)"} style={{marginLeft:4}} />}
                 </View>
               </View>
             </View>
           )
        }}
      />
      
      {!contato.banido && (
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.inputArea}>
             <TouchableOpacity onPress={onFotoGaleria} style={{padding:10}}><Ionicons name="images" size={24} color={THEME.primary}/></TouchableOpacity>
             <TouchableOpacity onPress={onFotoCamera} style={{padding:10}}><Ionicons name="camera" size={24} color={THEME.primary}/></TouchableOpacity>
             <TextInput style={styles.inputChat} value={txt} onChangeText={setTxt} placeholder="Mensagem..." multiline/>
             <TouchableOpacity onPress={() => { onEnviar(txt); setTxt(''); }} style={{backgroundColor:THEME.primary, width:45, height:45, borderRadius:23, alignItems:'center', justifyContent:'center'}}><Ionicons name="send" size={20} color="white" /></TouchableOpacity>
          </KeyboardAvoidingView>
      )}
    </View>
  );
};