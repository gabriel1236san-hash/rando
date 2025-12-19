import React, { useState, useEffect } from 'react';
import { View, Alert, Modal, ScrollView, Text, TouchableOpacity, Image, ActivityIndicator, TouchableWithoutFeedback } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useChat } from '../contexts/ChatContext';
import { TelaChat, Badge, ButtonPrimary, MediaViewer } from '../components';
import * as ImagePicker from 'expo-image-picker';
import { styles, THEME } from '../styles';
import { Audio, Video, ResizeMode } from 'expo-av';

export function ChatScreen({ navigation }) {
    const [modalPerfilVisible, setModalPerfilVisible] = useState(false);
    const [enviandoImagem, setEnviandoImagem] = useState(false);
    const [recording, setRecording] = useState(null);
    const [isRecording, setIsRecording] = useState(false);
    const [audioLevel, setAudioLevel] = useState(0);
    const [recordingDuration, setRecordingDuration] = useState(0);
    const [timerRef, setTimerRef] = useState(null);
    const [menuAnexosVisible, setMenuAnexosVisible] = useState(false);
    const [midiaZoom, setMidiaZoom] = useState(null); // Guarda o OBJETO da mídia (foto ou video) para abrir

    const { chatAtivo, mensagensPorSala, enviarMsg, todosPerfis, socket, setChatAtivo, minhaListaBloqueio, bloquear } = useChat();

    useEffect(() => { if (chatAtivo && socket) { socket.emit('pedir_historico', chatAtivo.idSala); } }, [chatAtivo]);

    const uploadImagemParaCloudinary = async (imageUri) => {
        const CLOUD_NAME = "dsdvqwwp6"; const UPLOAD_PRESET = "Randochat"; 
        const data = new FormData();
        let filename = imageUri.split('/').pop(); let match = /\.(\w+)$/.exec(filename); let type = match ? `image/${match[1]}` : `image`;
        data.append('file', { uri: imageUri, name: filename, type }); data.append('upload_preset', UPLOAD_PRESET);
        try {
            let response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, { method: 'POST', body: data });
            let json = await response.json(); return json.secure_url;
        } catch (error) { return null; }
    };

    const uploadAudioParaCloudinary = async (audioUri) => {
        const CLOUD_NAME = "dsdvqwwp6"; const UPLOAD_PRESET = "Randochat"; 
        const data = new FormData();
        let filename = audioUri.split('/').pop();
        // Cloudinary precisa de resource_type: 'video' para áudios na maioria dos casos
        data.append('file', { uri: audioUri, name: filename, type: 'audio/m4a' }); 
        data.append('upload_preset', UPLOAD_PRESET);
        data.append('resource_type', 'video'); 
        try {
            let response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/video/upload`, { method: 'POST', body: data });
            let json = await response.json(); return json.secure_url;
        } catch (error) { return null; }
    };

    const uploadVideoParaCloudinary = async (videoUri) => {
        const CLOUD_NAME = "dsdvqwwp6"; 
        const UPLOAD_PRESET = "Randochat"; 
        
        const data = new FormData();
        // Pega o nome do arquivo
        let filename = videoUri.split('/').pop();
        
        // Configura para envio de vídeo
        data.append('file', { 
            uri: videoUri, 
            name: filename, 
            type: 'video/mp4' // Geralmente gravam em mp4
        }); 
        data.append('upload_preset', UPLOAD_PRESET);
        data.append('resource_type', 'video'); // Importante!
        
        try {
            let response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/video/upload`, { 
                method: 'POST', 
                body: data 
            });
            let json = await response.json(); 
            return json.secure_url;
        } catch (error) { 
            console.error("Erro upload video", error);
            return null; 
        }
    };

    async function startRecording() {
        try {
            const permission = await Audio.requestPermissionsAsync();
            if (permission.status !== 'granted') {
                Alert.alert("Permissão", "Precisamos de acesso ao microfone para gravar áudio.");
                return;
            }
            
            // Configura o modo de áudio no sistema
            await Audio.setAudioModeAsync({ 
                allowsRecordingIOS: true, 
                playsInSilentModeIOS: true 
            });
            
            const newRecording = new Audio.Recording();
            
            // AQUI ESTAVA O ERRO: Mudamos para Audio.RecordingOptionsPresets.HIGH_QUALITY
            await newRecording.prepareToRecordAsync({
                ...Audio.RecordingOptionsPresets.HIGH_QUALITY,
                isMeteringEnabled: true,
            });

            newRecording.setOnRecordingStatusUpdate((status) => {
                if (status.isRecording) {
                    const level = status.metering; 
                    // Normalização do volume para a barrinha visual (apenas cosmético)
                    const visualLevel = Math.max(0, (160 + level) / 1.6); 
                    setAudioLevel(visualLevel);
                }
            });

            // Zera o contador e inicia
            setRecordingDuration(0);
            const timer = setInterval(() => {
                setRecordingDuration(prev => prev + 1);
            }, 1000);
            setTimerRef(timer);

            await newRecording.startAsync();
            setRecording(newRecording);
            setIsRecording(true);
        } catch (err) {
            console.error('Falha ao gravar', err);
            Alert.alert("Erro", "Não foi possível iniciar a gravação.");
        }
    }

    const stopTimer = () => {
        if (timerRef) clearInterval(timerRef);
        setTimerRef(null);
        setRecordingDuration(0);
    };

    async function cancelRecording() {
        stopTimer();
        if (!recording) return;
        setIsRecording(false);
        setAudioLevel(0);
        try {
            await recording.stopAndUnloadAsync(); // Para
            setRecording(null); 
        } catch (error) { console.error(error); }
    }

    async function stopAndSendRecording() {
        stopTimer();
        if (!recording) return;
        setIsRecording(false);
        try {
            await recording.stopAndUnloadAsync();
            const uri = recording.getURI();
            setRecording(null);
            
            // Envia o áudio
            const audioUrl = await uploadAudioParaCloudinary(uri);
            if (audioUrl) {
                enviarMsg(audioUrl, 'audio', 'mic');
            }
        } catch (error) { console.error(error); }
    }

    // 2. Função unificada para abrir qualquer coisa
    const handleAbrirMidia = (item) => {
        setMidiaZoom(item); // Abre o nosso MediaViewer
    };

    const handleVoltar = () => {
        setChatAtivo(null); 
        if (navigation.canGoBack()) { navigation.goBack(); } else { navigation.navigate('Home'); }
    };

    if (!chatAtivo) return <View style={{flex:1, backgroundColor:'white'}} />;

    const renderModalPerfil = () => {
        if (!modalPerfilVisible) return null;
        const u = chatAtivo; 
        const bloq = (minhaListaBloqueio || []).includes(u.nick);
        const fotosValidas = (u.fotos || []).filter(f => f);

        return (
            <Modal visible transparent animationType='slide' onRequestClose={() => setModalPerfilVisible(false)}>
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
                    <View style={styles.modalContainer}>
                        <View style={{ padding: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Text style={{ fontWeight: 'bold', fontSize: 18 }}>Perfil</Text>
                            <TouchableOpacity onPress={() => setModalPerfilVisible(false)}><Ionicons name="close" size={28} color="#333" /></TouchableOpacity>
                        </View>
                        <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
                            {fotosValidas.length > 0 ? (
                                <View>
                                    <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} style={styles.carouselContainer}>
                                        {fotosValidas.map((f, i) => (
                                             <TouchableOpacity key={i} activeOpacity={0.9} onPress={() => { 
                                                 setMidiaZoom({ content: f, origin: 'gallery', type: 'image' });
                                             }}>
                                                <Image source={{ uri: f }} style={styles.carouselImage} />
                                             </TouchableOpacity>
                                        ))}
                                    </ScrollView>
                                    {fotosValidas.length > 1 && (
                                        <>
                                            <View style={styles.setaEsquerda} pointerEvents="none"><Ionicons name="chevron-back" size={24} color="white" /></View>
                                            <View style={styles.setaDireita} pointerEvents="none"><Ionicons name="chevron-forward" size={24} color="white" /></View>
                                            <View style={styles.indicadoresContainer}>
                                                {fotosValidas.map((_, i) => <View key={i} style={styles.indicadorDot} />)}
                                                <Text style={{fontSize: 10, color: '#999', marginLeft: 10}}>Deslize</Text>
                                            </View>
                                        </>
                                    )}
                                </View>
                            ) : (
                                <View style={{ alignItems: 'center', marginVertical: 20 }}>
                                    <Image source={u.fotoPrincipal ? { uri: u.fotoPrincipal } : require('../../assets/icon.png')} style={{ width: 140, height: 140, borderRadius: 40 }} />
                                </View>
                            )}
                            <View style={{ paddingHorizontal: 25 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <Text style={{ fontSize: 28, fontWeight: 'bold' }}>{u.nome}</Text>
                                    {u.isAdmin && <Badge tipo="admin" />}
                                </View>
                                <Text style={{ fontSize: 16, color: '#666' }}>@{u.nick} • {u.idade} anos</Text>
                                <Text style={{ marginTop: 20, fontWeight: 'bold', color: '#333' }}>Sobre</Text>
                                <Text style={{ marginTop: 8, padding: 15, backgroundColor: '#f2f2f7', borderRadius: 15, lineHeight: 20 }}>{u.bio || 'Sem biografia.'}</Text>
                                <ButtonPrimary texto={bloq ? "DESBLOQUEAR" : "BLOQUEAR"} onPress={() => bloquear(u.nick)} style={{ marginTop: 30, backgroundColor: bloq ? THEME.danger : '#999' }} />
                            </View>
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        );
    };

    const enviarFoto = async (origem) => {
        const config = { mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.3, allowsEditing: true, aspect: [4, 5] };
        let r = origem === 'camera' ? await ImagePicker.launchCameraAsync(config) : await ImagePicker.launchImageLibraryAsync(config);
        if(!r.canceled) {
            setEnviandoImagem(true);
            const imageUrl = await uploadImagemParaCloudinary(r.assets[0].uri);
            if (imageUrl) enviarMsg(imageUrl, 'image', origem);
            setEnviandoImagem(false);
        }
    };

    // 2. Mude a função escolherOrigemVideo para apenas abrir o menu
    const abrirMenuVideo = () => {
        setMenuAnexosVisible(true);
    };

    // 3. Função auxiliar para selecionar e fechar o menu
    const selecionarOrigem = (origem) => {
        setMenuAnexosVisible(false); // Fecha o menu
        setTimeout(() => {
            enviarVideo(origem); // Chama a função de envio após fechar
        }, 500); // Um pequeno delay para a animação fluir
    };

    const enviarVideo = async (origem) => {
        // Configuração para aceitar VÍDEOS
        const config = { 
            mediaTypes: ImagePicker.MediaTypeOptions.Videos, // <--- O segredo está aqui
            allowsEditing: true, 
            quality: 0.5, // Vídeo pesa muito, melhor reduzir a qualidade
            videoMaxDuration: 60, // Limite de 60 segundos (opcional)
        };

        let r;
        if (origem === 'camera') {
            r = await ImagePicker.launchCameraAsync(config);
        } else {
            r = await ImagePicker.launchImageLibraryAsync(config);
        }

        if (!r.canceled) {
            setEnviandoImagem(true); // Reutilizando seu loading visual
            try {
                const videoUrl = await uploadVideoParaCloudinary(r.assets[0].uri);
                if (videoUrl) {
                    // Envia como tipo 'video'
                    enviarMsg(videoUrl, 'video', origem);
                }
            } catch (e) {
                Alert.alert("Erro", "Falha ao enviar vídeo");
            }
            setEnviandoImagem(false);
        }
    };

    // 4. Crie o Componente Visual do Menu (Coloque antes do return)
    const RenderMenuAnexos = () => {
        return (
            <Modal
                visible={menuAnexosVisible}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setMenuAnexosVisible(false)}
            >
                {/* Fundo escuro que fecha ao tocar */}
                <TouchableOpacity 
                    style={{flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end'}} 
                    activeOpacity={1} 
                    onPress={() => setMenuAnexosVisible(false)}
                >
                    {/* O Painel Branco (Bottom Sheet) */}
                    <View style={{backgroundColor: 'white', borderTopLeftRadius: 25, borderTopRightRadius: 25, padding: 20, paddingBottom: 40}}>
                        
                        {/* Barrinha cinza para indicar que puxa */}
                        <View style={{alignSelf:'center', width: 40, height: 5, backgroundColor:'#ccc', borderRadius:10, marginBottom: 20}}/>
                        
                        <Text style={{fontSize: 18, fontWeight: 'bold', marginBottom: 20, color: '#333'}}>Enviar Vídeo</Text>

                        {/* Opção 1: Câmera */}
                        <TouchableOpacity 
                            onPress={() => selecionarOrigem('camera')}
                            style={{flexDirection: 'row', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#f0f0f0'}}
                        >
                            <View style={{width: 50, height: 50, borderRadius: 25, backgroundColor: '#ffebee', alignItems: 'center', justifyContent: 'center', marginRight: 15}}>
                                <Ionicons name="videocam" size={24} color="#e53935" />
                            </View>
                            <View>
                                <Text style={{fontSize: 16, fontWeight: '600', color: '#333'}}>Gravar Vídeo</Text>
                                <Text style={{fontSize: 12, color: '#999'}}>Usar a câmera agora</Text>
                            </View>
                        </TouchableOpacity>

                        {/* Opção 2: Galeria */}
                        <TouchableOpacity 
                            onPress={() => selecionarOrigem('gallery')}
                            style={{flexDirection: 'row', alignItems: 'center', paddingVertical: 15}}
                        >
                            <View style={{width: 50, height: 50, borderRadius: 25, backgroundColor: '#e3f2fd', alignItems: 'center', justifyContent: 'center', marginRight: 15}}>
                                <Ionicons name="images" size={24} color="#1e88e5" />
                            </View>
                            <View>
                                <Text style={{fontSize: 16, fontWeight: '600', color: '#333'}}>Escolher da Galeria</Text>
                                <Text style={{fontSize: 12, color: '#999'}}>Importar vídeo existente</Text>
                            </View>
                        </TouchableOpacity>

                    </View>
                </TouchableOpacity>
            </Modal>
        );
    };

    return (
        <View style={{flex:1, backgroundColor: 'white'}}>
            {enviandoImagem && (
                <View style={{position: 'absolute', zIndex: 999, top:0, bottom:0, left:0, right:0, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent:'center', alignItems:'center'}}>
                    <ActivityIndicator size="large" color={THEME.primary} />
                </View>
            )}
            
            {/* --- O NOVO PLAYER UNIFICADO --- */}
            <MediaViewer 
                visible={!!midiaZoom} 
                item={midiaZoom} 
                onClose={() => setMidiaZoom(null)} 
            />

            <RenderMenuAnexos />
            {renderModalPerfil()}
            <TelaChat 
                contato={chatAtivo} 
                msgs={mensagensPorSala[chatAtivo.idSala] || []}
                onVoltar={handleVoltar}
                onEnviar={enviarMsg}
                onFotoCamera={() => enviarFoto('camera')}
                onFotoGaleria={() => enviarFoto('gallery')}
                onVideoCamera={() => enviarVideo('camera')} // Mantido por compatibilidade, mas o botão principal usa o de baixo
                onVideoGaleria={() => enviarVideo('gallery')} // Mantido por compatibilidade
                onEnviarVideo={abrirMenuVideo} // Agora chama a função que abre o menu
                onVideoZoom={handleAbrirMidia} // <--- Usa a nova função unificada
                onZoom={handleAbrirMidia}      // <--- Usa a nova função unificada
                onVerPerfil={() => setModalPerfilVisible(true)}
                onDenunciar={() => Alert.alert("Denúncia", "Reportado.")}
                contatoOnline={todosPerfis.find(p=>p.nick===chatAtivo.nick)?.online}
                onStartRecord={startRecording}
                onStopRecord={stopAndSendRecording}
                isRecording={isRecording}
                audioLevel={audioLevel}
                onCancelRecord={cancelRecording}
                recordingDuration={recordingDuration}
            />
        </View>
    );
}
