import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, TextInput, Image, FlatList, KeyboardAvoidingView, Platform, StyleSheet, Modal, Dimensions, ScrollView, TouchableWithoutFeedback, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { styles, THEME } from './styles';
import { socket } from './config';
import { Audio, Video, ResizeMode } from 'expo-av';
import Slider from '@react-native-community/slider';

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

// Função auxiliar para formatar tempo (ex: 65s -> "1:05")
const formatTime = (millis) => {
    if (!millis) return "0:00";
    const minutes = Math.floor(millis / 60000);
    const seconds = Math.floor((millis % 60000) / 1000);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
};

export const AudioBubble = ({ uri, isEu }) => {
    const [sound, setSound] = useState();
    const [isPlaying, setIsPlaying] = useState(false);
    const [duration, setDuration] = useState(0);
    const [position, setPosition] = useState(0);

    async function loadSound() {
        // Carrega o som, mas não toca automaticamente ainda
        const { sound: newSound, status } = await Audio.Sound.createAsync(
            { uri },
            { shouldPlay: false } 
        );
        setSound(newSound);
        setDuration(status.durationMillis);

        // Monitora o progresso do áudio
        newSound.setOnPlaybackStatusUpdate((status) => {
            if (status.isLoaded) {
                setDuration(status.durationMillis);
                setPosition(status.positionMillis);
                if (status.didJustFinish) {
                    setIsPlaying(false);
                    newSound.stopAsync(); // <--- A Solução: Para e rebobina ao mesmo tempo
                }
            }
        });
    }

    // Carrega o som assim que a mensagem aparece na tela para pegar a duração
    useEffect(() => {
        loadSound();
        return () => {
            if (sound) sound.unloadAsync();
        };
    }, []);

    async function togglePlay() {
        if (!sound) return;
        if (isPlaying) {
            await sound.pauseAsync();
            setIsPlaying(false);
        } else {
            await sound.playAsync();
            setIsPlaying(true);
        }
    }

    async function onSeek(value) {
        if (sound) {
            await sound.setPositionAsync(value);
        }
    }

    return (
        <View style={{ 
            flexDirection: 'row', 
            alignItems: 'center', 
            width: 220, // Largura fixa para ficar bonito
            padding: 5 
        }}>
            {/* Botão Play/Pause */}
            <TouchableOpacity onPress={togglePlay} style={{ padding: 5 }}>
                <Ionicons 
                    name={isPlaying ? "pause-circle" : "play-circle"} 
                    size={38} 
                    color={isEu ? "#fff" : "#333"} 
                />
            </TouchableOpacity>

            {/* Coluna com Slider e Tempo */}
            <View style={{ flex: 1, marginLeft: 5 }}>
                <Slider
                    style={{ width: '100%', height: 20 }}
                    minimumValue={0}
                    maximumValue={duration}
                    value={position}
                    onSlidingComplete={onSeek}
                    minimumTrackTintColor={isEu ? "#fff" : "#333"}
                    maximumTrackTintColor={isEu ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.2)"}
                    thumbTintColor={isEu ? "#fff" : "#333"}
                />
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 5 }}>
                    <Text style={{ color: isEu ? "rgba(255,255,255,0.8)" : "#666", fontSize: 10 }}>
                        {formatTime(position)}
                    </Text>
                    <Text style={{ color: isEu ? "rgba(255,255,255,0.8)" : "#666", fontSize: 10 }}>
                        {formatTime(duration)}
                    </Text>
                </View>
            </View>
        </View>
    );
};

export const VideoBubble = ({ item, onZoom }) => {
    const videoRef = useRef(null);
    const uri = item.content;
    // const [status, setStatus] = useState({}); // Removido se não for usar status visualmente agora

    return (
        <View style={{ width: 220, height: 160, borderRadius: 15, overflow: 'hidden', backgroundColor: 'black', position: 'relative' }}>
            <Video
                ref={videoRef}
                style={{ width: '100%', height: '100%' }}
                source={{ uri }}
                useNativeControls // Mostra os controles nativos (play, pause, tela cheia)
                resizeMode={ResizeMode.CONTAIN}
                isLooping={false}
                // onPlaybackStatusUpdate={status => setStatus(() => status)}
            />
            
            {/* Botão de Expandir (Fica no canto superior direito do vídeo) */}
            <TouchableOpacity 
                onPress={() => onZoom && onZoom(item)}
                style={{
                    position: 'absolute', 
                    top: 5, 
                    right: 5, 
                    backgroundColor: 'rgba(0,0,0,0.6)', 
                    padding: 5, 
                    borderRadius: 15
                }}
            >
                <Ionicons name="expand" size={16} color="white" />
            </TouchableOpacity>
        </View>
    );
};

export const MediaViewer = ({ item, visible, onClose }) => {
    if (!item || !visible) return null;

    const [showControls, setShowControls] = useState(true);
    const [status, setStatus] = useState({});
    const videoRef = useRef(null);
    const isVideo = item.type === 'video';

    // Dados para o Selo/Etiqueta
    const isCamera = item.origin === 'camera';
    const seloCor = isCamera ? '#00C853' : '#007AFF';
    const seloLabel = isCamera ? "Ao Vivo" : "Galeria";
    const seloIcon = isCamera ? (isVideo ? "videocam" : "camera") : (isVideo ? "film" : "image");

    // Lógica do Vídeo
    const togglePlay = async () => {
        if (!videoRef.current) return;
        if (status.isPlaying) {
            await videoRef.current.pauseAsync();
        } else {
            if (status.positionMillis >= status.durationMillis) {
                await videoRef.current.replayAsync();
            } else {
                await videoRef.current.playAsync();
            }
        }
    };

    const onSeek = async (value) => {
        if (videoRef.current) {
            await videoRef.current.setPositionAsync(value);
        }
    };

    return (
        <Modal visible={visible} transparent={false} animationType="fade" onRequestClose={onClose}>
            <View style={{ flex: 1, backgroundColor: 'black', justifyContent: 'center' }}>
                
                {/* 1. Área de Toque Principal (Esconde/Mostra controles) */}
                <TouchableWithoutFeedback onPress={() => setShowControls(!showControls)}>
                    <View style={{ width: '100%', height: '100%', justifyContent: 'center' }}>
                        
                        {isVideo ? (
                            <Video
                                ref={videoRef}
                                source={{ uri: item.content }}
                                style={{ width: '100%', height: '100%' }}
                                resizeMode={ResizeMode.CONTAIN}
                                shouldPlay={true}
                                isLooping={false}
                                useNativeControls={false} // DESATIVAMOS O NATIVO PARA USAR O NOSSO
                                onPlaybackStatusUpdate={status => setStatus(() => status)}
                            />
                        ) : (
                            // Player de Foto (Usando ScrollView para permitir Zoom simples se quiser no futuro)
                            <Image 
                                source={{ uri: item.content }} 
                                style={{ width: '100%', height: '100%' }} 
                                resizeMode="contain" 
                            />
                        )}

                    </View>
                </TouchableWithoutFeedback>

                {/* 2. Camada de Controles (Overlay) */}
                {showControls && (
                    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
                        
                        {/* Botão Fechar (Topo) */}
                        <TouchableOpacity 
                            onPress={onClose} 
                            style={{ position: 'absolute', top: 40, right: 20, zIndex: 10, padding: 10 }}
                        >
                            <Ionicons name="close-circle" size={36} color="white" style={{ shadowColor:'black', shadowOpacity:0.8, shadowRadius:2 }}/>
                        </TouchableOpacity>

                        {/* Botão Play Gigante no Meio (Só Vídeo e se estiver pausado) */}
                        {isVideo && !status.isPlaying && (
                            <View style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, justifyContent: 'center', alignItems: 'center' }} pointerEvents="none">
                                <Ionicons name="play-circle" size={80} color="rgba(255,255,255,0.7)" />
                            </View>
                        )}

                        {/* Barra de Controles Inferior (Só Vídeo) */}
                        {isVideo && (
                            <View style={{ position: 'absolute', bottom: 40, left: 20, right: 20, flexDirection: 'row', alignItems: 'center' }}>
                                <TouchableOpacity onPress={togglePlay} style={{ marginRight: 10 }}>
                                    <Ionicons name={status.isPlaying ? "pause" : "play"} size={30} color="white" />
                                </TouchableOpacity>
                                
                                <Text style={{ color: 'white', fontSize: 12, minWidth: 35 }}>
                                    {formatTime(status.positionMillis)}
                                </Text>

                                <Slider
                                    style={{ flex: 1, height: 40, marginHorizontal: 10 }}
                                    minimumValue={0}
                                    maximumValue={status.durationMillis || 0}
                                    value={status.positionMillis || 0}
                                    onSlidingComplete={onSeek}
                                    minimumTrackTintColor="#FFFFFF"
                                    maximumTrackTintColor="rgba(255, 255, 255, 0.3)"
                                    thumbTintColor="#FFFFFF"
                                />

                                <Text style={{ color: 'white', fontSize: 12, minWidth: 35 }}>
                                    {formatTime(status.durationMillis)}
                                </Text>
                            </View>
                        )}

                        {/* 3. O SELO (Etiqueta) - Centralizado na parte inferior */}
                        <View style={{ 
                            position: 'absolute', 
                            bottom: isVideo ? 90 : 50, // Se for vídeo, sobe mais pra não bater no slider
                            alignSelf: 'center', 
                            flexDirection: 'row', 
                            alignItems: 'center', 
                            backgroundColor: seloCor, 
                            paddingHorizontal: 15, 
                            paddingVertical: 8, 
                            borderRadius: 20,
                            shadowColor: "#000", shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.25, shadowRadius: 3.84, elevation: 5
                        }}>
                            <Ionicons name={seloIcon} size={16} color="white" />
                            <Text style={{ color: 'white', marginLeft: 8, fontWeight: 'bold' }}>{seloLabel}</Text>
                        </View>

                    </View>
                )}
            </View>
        </Modal>
    );
};

// Função auxiliar de renderização de origem (Movida para fora para ser usada no VideoSeguro)
const renderOrigem = (origin, type) => {
    if (!origin) return null;

    // Configuração para restaurar o DESIGN ANTIGO (Cores e Posição)
    let iconName = 'help';
    let label = '';
    let bgColor = '#999'; // Cor padrão
    
    // Configurações baseadas na origem
    if (origin === 'camera') {
        // Verde (igual ao estilo tagCamera antigo)
        bgColor = '#00C853'; 
        iconName = type === 'video' ? 'videocam' : 'camera';
        label = type === 'video' ? 'Ao Vivo' : 'Ao Vivo';
    } 
    else if (origin === 'gallery') {
        // Azul (igual ao estilo tagGallery antigo)
        bgColor = '#007AFF'; 
        iconName = type === 'video' ? 'film' : 'image';
        label = type === 'video' ? 'Galeria' : 'Galeria';
    }

    return (
        <View style={{
            position: 'absolute', 
            bottom: 6, // Margem inferior
            left: 6,   // <<< AQUI ESTÁ A CORREÇÃO: Volta para a esquerda
            flexDirection: 'row', 
            alignItems: 'center', 
            backgroundColor: bgColor, 
            paddingHorizontal: 8, 
            paddingVertical: 4, 
            borderRadius: 8,
            elevation: 2, // Sombra leve no Android
            zIndex: 10 // Garante que fica em cima
        }}>
            <Ionicons name={iconName} size={10} color="white" style={{ marginRight: 4 }} />
            <Text style={{ color: 'white', fontSize: 10, fontWeight: 'bold' }}>{label}</Text>
        </View>
    );
};

export const VideoSeguro = ({ item, onZoom, isEu }) => {
    const [revelado, setRevelada] = useState(false);

    // No chat, mostramos apenas uma "Thumbnail" (miniatura) com um botão de Play
    return (
        <TouchableOpacity 
            onPress={() => isEu || revelado ? onZoom(item) : setRevelada(true)} 
            style={[styles.imgChat, { backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' }]}
        >
            <Image 
                source={{ uri: item.content }} 
                style={[StyleSheet.absoluteFill, { opacity: isEu || revelado ? 0.5 : 0.2 }]} 
                blurRadius={isEu || revelado ? 0 : 15}
            />
            <Ionicons name={isEu || revelado ? "play-circle" : "eye-off"} size={50} color="white" />
            {(!isEu && !revelado) && <Text style={{color:'white', fontSize:12}}>Toque para liberar</Text>}
            
            {/* O selo aparece aqui no chat também, usando a lógica que já temos */}
            {renderOrigem(item.origin, item.type)}
        </TouchableOpacity>
    );
};

export const TelaChat = ({ contato, msgs, onVoltar, onEnviar, onFotoCamera, onFotoGaleria, onEnviarVideo, onVideoZoom, onZoom, onVerPerfil, onDenunciar, contatoOnline, onStartRecord, onStopRecord, isRecording, audioLevel, onCancelRecord, recordingDuration }) => {
  const [txt, setTxt] = useState('');
  const flatListRef = useRef(null);

  // CORREÇÃO DA ORDEM: Ordena da mais recente para a mais antiga
  const msgsOrdenadas = [...msgs].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  useEffect(() => {
     if(msgs.length > 0) {
         const ultimas = msgs.filter(m => m.sender === 'eles' && !m.lido);
         ultimas.forEach(m => socket.emit('marcar_lida', { room: contato.idSala, msgId: m.id }));
     }
  }, [msgs]);
  
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
        data={msgsOrdenadas} 
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
                     </View>
                 ) : item.type === 'audio' ? (
                     <AudioBubble uri={item.content} isEu={isEu} />
                 ) : item.type === 'video' ? (
                     isEu ? (
                        <VideoBubble item={item} onZoom={onVideoZoom} />
                     ) : (
                        <VideoSeguro item={item} onZoom={onVideoZoom} style={styles.imgChat} isEu={isEu} />
                     )
                 ) : (
                     <Text style={[styles.msgText, isEu ? {color:'white'} : {color: THEME.text}]}>{item.content}</Text>
                 )}

                 {/* ATENÇÃO: Chame passando os DOIS parâmetros e coloque APÓS o conteúdo visual */}
                 {(item.type === 'image') && 
                    renderOrigem(item.origin, item.type)
                 }
                 
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
             {isRecording ? (
                <View style={{
                    flexDirection: 'row', 
                    alignItems: 'center', 
                    backgroundColor: '#fff', 
                    borderTopWidth: 1, 
                    borderTopColor: '#eee',
                    paddingVertical: 10,
                    paddingHorizontal: 15
                }}>
                    {/* Lado Esquerdo: Tempo piscando */}
                    <View style={{flexDirection: 'row', alignItems: 'center', width: 80}}>
                        <View style={{
                            width: 10, height: 10, borderRadius: 5, backgroundColor: 'red', marginRight: 8,
                            opacity: (recordingDuration % 2 === 0) ? 1 : 0.5 // Pisca a cada segundo
                        }}/>
                        <Text style={{color: 'red', fontWeight: 'bold'}}>
                            {formatTime(recordingDuration * 1000)} {/* Reutilizando a função formatTime que criamos acima */}
                        </Text>
                    </View>

                    {/* Meio: Visualizador de Voz (Limitado para não invadir) */}
                    <View style={{flex: 1, height: 30, justifyContent: 'center', marginHorizontal: 10}}>
                         {/* Barra de fundo cinza clara */}
                         <View style={{width: '100%', height: 4, backgroundColor: '#f0f0f0', borderRadius: 2, overflow:'hidden'}}>
                             {/* Barra vermelha dinâmica */}
                             <View style={{
                                 height: '100%', 
                                 width: `${Math.min(audioLevel, 100)}%`, // O level define a largura
                                 backgroundColor: 'red'
                             }}/>
                         </View>
                         <Text style={{fontSize: 10, color: '#999', textAlign: 'center', marginTop: 2}}>
                             {audioLevel > 10 ? "Captando áudio..." : "Fale agora"}
                         </Text>
                    </View>

                    {/* Lado Direito: Ações */}
                    <View style={{flexDirection: 'row'}}>
                        <TouchableOpacity onPress={onCancelRecord} style={{padding: 10}}>
                            <Text style={{color: '#666', fontWeight: 'bold'}}>Cancelar</Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity onPress={onStopRecord} style={{
                            backgroundColor: THEME.primary, 
                            width: 40, height: 40, borderRadius: 20, 
                            alignItems: 'center', justifyContent: 'center',
                            marginLeft: 5
                        }}>
                            <Ionicons name="arrow-up" size={24} color="white" />
                        </TouchableOpacity>
                    </View>
                </View>
             ) : (
                 <>
                    <TouchableOpacity onPress={onFotoGaleria} style={{padding:10}}><Ionicons name="images" size={24} color={THEME.primary}/></TouchableOpacity>
                    <TouchableOpacity onPress={onFotoCamera} style={{padding:10}}><Ionicons name="camera" size={24} color={THEME.primary}/></TouchableOpacity>
                    <TouchableOpacity onPress={onEnviarVideo} style={{padding:10}}>
                        <Ionicons name="videocam" size={24} color={THEME.primary}/>
                    </TouchableOpacity>
                    <TextInput style={styles.inputChat} value={txt} onChangeText={setTxt} placeholder="Mensagem..." multiline/>
                    {txt.length > 0 ? (
                        <TouchableOpacity onPress={() => { onEnviar(txt); setTxt(''); }} style={{backgroundColor:THEME.primary, width:45, height:45, borderRadius:23, alignItems:'center', justifyContent:'center'}}><Ionicons name="send" size={20} color="white" /></TouchableOpacity>
                    ) : (
                        <TouchableOpacity onPress={onStartRecord} style={{padding:10}}>
                           <Ionicons name="mic" size={24} color={THEME.primary}/>
                        </TouchableOpacity>
                    )}
                 </>
             )}
          </KeyboardAvoidingView>
      )}
    </View>
  );
};
