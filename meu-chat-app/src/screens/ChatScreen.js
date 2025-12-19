import React, { useState, useEffect } from 'react';
import { View, Alert, Modal, ScrollView, Text, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import ImageViewing from "react-native-image-viewing";
import { Ionicons } from '@expo/vector-icons';
import { useChat } from '../contexts/ChatContext';
import { TelaChat, Badge, ButtonPrimary } from '../components';
import * as ImagePicker from 'expo-image-picker';
import { styles, THEME } from '../styles';

export function ChatScreen({ navigation }) {
    const [zoomVisible, setZoomVisible] = useState(false);
    const [fotoSelecionada, setFotoSelecionada] = useState(null);
    const [modalPerfilVisible, setModalPerfilVisible] = useState(false);
    const [enviandoImagem, setEnviandoImagem] = useState(false);
    const [zoomImages, setZoomImages] = useState([]); // ADICIONADO PARA O ZOOM FUNCIONAR DO MODAL

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

    const handleZoom = (item) => { setFotoSelecionada(item); setZoomVisible(true); };

    const RenderFooter = () => {
        if (!fotoSelecionada || !fotoSelecionada.origin) return null;
        const isCamera = fotoSelecionada.origin === 'camera';
        return (
            <View style={{ paddingBottom: 60, alignItems: 'center' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.8)', padding: 12, borderRadius: 25 }}>
                    <Ionicons name={isCamera ? "camera" : "image"} size={20} color={isCamera ? "#00C853" : "#007AFF"} />
                    <Text style={{ color: 'white', marginLeft: 10, fontWeight: 'bold' }}>{isCamera ? "Foto Tirada Ao Vivo" : "Foto da Galeria"}</Text>
                </View>
            </View>
        );
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
                                                 setFotoSelecionada({ content: f, origin: 'gallery' }); // Adaptação para o zoom funcionar
                                                 setZoomVisible(true); 
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

    return (
        <View style={{flex:1, backgroundColor: 'white'}}>
            {enviandoImagem && (
                <View style={{position: 'absolute', zIndex: 999, top:0, bottom:0, left:0, right:0, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent:'center', alignItems:'center'}}>
                    <ActivityIndicator size="large" color={THEME.primary} />
                </View>
            )}
            <ImageViewing images={fotoSelecionada ? [{ uri: fotoSelecionada.content }] : []} visible={zoomVisible} onRequestClose={() => setZoomVisible(false)} FooterComponent={RenderFooter}/>
            {renderModalPerfil()}
            <TelaChat 
                contato={chatAtivo} 
                msgs={mensagensPorSala[chatAtivo.idSala] || []}
                onVoltar={handleVoltar}
                onEnviar={enviarMsg}
                onFotoCamera={() => enviarFoto('camera')}
                onFotoGaleria={() => enviarFoto('gallery')}
                onZoom={handleZoom}
                onVerPerfil={() => setModalPerfilVisible(true)}
                onDenunciar={() => Alert.alert("Denúncia", "Reportado.")}
                contatoOnline={todosPerfis.find(p=>p.nick===chatAtivo.nick)?.online}
            />
        </View>
    );
}