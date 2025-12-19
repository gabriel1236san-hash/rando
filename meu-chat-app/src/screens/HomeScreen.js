import React, { useState, useEffect } from 'react';
import { 
    View, Text, TouchableOpacity, FlatList, Image, 
    SafeAreaView, ScrollView, Modal, Alert, ActivityIndicator,
    RefreshControl
} from 'react-native';
import ImageViewing from "react-native-image-viewing";
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useChat } from '../contexts/ChatContext';
import { styles, THEME } from '../styles';
import { ContactCard, ButtonPrimary, InputModerno, Badge } from '../components';
import * as ImagePicker from 'expo-image-picker';

export function HomeScreen({ navigation }) {
    const [abaAtual, setAbaAtual] = useState('conversas'); 
    const [modalPerfilUser, setModalPerfilUser] = useState(null);
    const [zoomVisible, setZoomVisible] = useState(false);
    const [salvando, setSalvando] = useState(false);
    const [zoomImages, setZoomImages] = useState([]);
    const [refreshing, setRefreshing] = useState(false);

    const { 
        meuNick, meuNome, setMeuNome, minhaBio, setMinhaBio,
        minhaIdade, setMinhaIdade, meuGenero, setMeuGenero,
        minhasFotos, setMinhasFotos, logout, logado,
        contatos, todosPerfis, buscando, setPreferenciaBusca, preferenciaBusca,
        socket, setChatAtivo, chatAtivo, minhaListaBloqueio, bloquear
    } = useChat();

    useEffect(() => { if (!logado) navigation.replace('Login'); }, [logado, navigation]);
    useEffect(() => { if (chatAtivo) navigation.navigate('Chat'); }, [chatAtivo]);
    useEffect(() => { if (socket && meuNick) socket.emit('recuperar_chats_antigos'); }, [socket, meuNick]);
    useFocusEffect(React.useCallback(() => { setChatAtivo(null); }, []));

    const onRefreshComunidade = () => {
        setRefreshing(true);
        socket.emit('pedir_comunidade', '');
        setTimeout(() => setRefreshing(false), 1000);
    };

    const upFoto = async (idx) => {
        let r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.5, allowsEditing: true });
        if (!r.canceled) { 
            const n = [...minhasFotos]; n[idx] = r.assets[0].uri; setMinhasFotos(n);
        }
    };

    const abrirChatDireto = (u) => { 
        setModalPerfilUser(null);
        socket.emit('iniciar_conversa_direta', u.nick); 
        setAbaAtual('conversas');
    };

    const uploadImagemParaCloudinary = async (imageUri) => {
        const CLOUD_NAME = "dsdvqwwp6"; const UPLOAD_PRESET = "Randochat"; 
        const data = new FormData();
        let filename = imageUri.split('/').pop();
        let match = /\.(\w+)$/.exec(filename);
        let type = match ? `image/${match[1]}` : `image`;
        data.append('file', { uri: imageUri, name: filename, type });
        data.append('upload_preset', UPLOAD_PRESET);
        try {
            let response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, { method: 'POST', body: data });
            let json = await response.json();
            return json.secure_url || null;
        } catch (error) { return null; }
    };

    const handleSalvarPerfil = async () => {
        setSalvando(true);
        let fotosComUrl = [];
        for (const foto of minhasFotos) {
            if (!foto) continue;
            if (foto.startsWith('http')) { fotosComUrl.push(foto); } 
            else {
                const urlNova = await uploadImagemParaCloudinary(foto);
                if (urlNova) fotosComUrl.push(urlNova);
            }
        }
        socket.emit('atualizar_perfil', { nome: meuNome, bio: minhaBio, idade: minhaIdade, genero: meuGenero, fotos: fotosComUrl });
        setSalvando(false);
    };

    const renderModalPerfil = () => {
        if (!modalPerfilUser) return null;
        const u = modalPerfilUser;
        const bloq = (minhaListaBloqueio || []).includes(u.nick);
        const fotosValidas = (u.fotos || []).filter(f => f);

        return (
            <Modal visible transparent animationType='slide' onRequestClose={() => setModalPerfilUser(null)}>
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
                    <View style={styles.modalContainer}>
                        {u.banido && <View style={styles.bannerBanido}><Text style={{ color: 'white', fontWeight: 'bold', fontSize: 18 }}>🚫 USUÁRIO BANIDO</Text></View>}
                        <View style={{ padding: 20, flexDirection: 'row', justifyContent: 'space-between' }}>
                            <Text style={{ fontWeight: 'bold', fontSize: 18 }}>Perfil de Usuário</Text>
                            <TouchableOpacity onPress={() => setModalPerfilUser(null)}><Ionicons name="close" size={24} /></TouchableOpacity>
                        </View>
                        <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
                            {fotosValidas.length > 0 ? (
                                <View>
                                    <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} style={styles.carouselContainer}>
                                        {fotosValidas.map((f, i) => (
                                            <TouchableOpacity key={i} activeOpacity={0.9} onPress={() => { setZoomImages(fotosValidas.map(img => ({ uri: img }))); setZoomVisible(true); }}>
                                                <Image source={{ uri: f }} style={styles.carouselImage} resizeMode="cover" />
                                            </TouchableOpacity>
                                        ))}
                                    </ScrollView>
                                    
                                    {/* INDICADORES VISUAIS (SETAS E BOLINHAS) */}
                                    {fotosValidas.length > 1 && (
                                        <>
                                            <View style={styles.setaEsquerda} pointerEvents="none">
                                                <Ionicons name="chevron-back" size={24} color="white" />
                                            </View>
                                            <View style={styles.setaDireita} pointerEvents="none">
                                                <Ionicons name="chevron-forward" size={24} color="white" />
                                            </View>
                                            <View style={styles.indicadoresContainer}>
                                                {fotosValidas.map((_, i) => (
                                                    <View key={i} style={styles.indicadorDot} />
                                                ))}
                                                <Text style={{fontSize: 10, color: '#999', marginLeft: 10}}>Deslize para ver</Text>
                                            </View>
                                        </>
                                    )}
                                </View>
                            ) : (
                                <TouchableOpacity style={{ alignItems: 'center', marginVertical: 20 }} onPress={() => { if (u.fotoPrincipal) { setZoomImages([{ uri: u.fotoPrincipal }]); setZoomVisible(true); } }}>
                                    <Image source={u.fotoPrincipal ? { uri: u.fotoPrincipal } : require('../../assets/icon.png')} style={{ width: 120, height: 120, borderRadius: 40 }} />
                                </TouchableOpacity>
                            )}
                            <View style={{ paddingHorizontal: 20 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <Text style={{ fontSize: 28, fontWeight: 'bold', color: u.banido ? THEME.danger : THEME.text }}>{u.nome}</Text>
                                    {u.isAdmin && <Badge tipo="admin" />}
                                    {u.verificado && <Badge tipo="verificado" />}
                                    {u.premium && <Badge tipo="premium" />}
                                </View>
                                <Text style={{ fontSize: 16, color: '#666' }}>@{u.nick} • {u.idade} anos</Text>
                                <Text style={{ marginTop: 20, fontWeight: 'bold', color: '#333' }}>Sobre</Text>
                                <Text style={{ marginTop: 5, padding: 15, backgroundColor: '#f9f9f9', borderRadius: 15, lineHeight: 20 }}>{u.bio || 'Sem biografia.'}</Text>
                                {u.nick !== meuNick && !u.banido && (
                                    <View style={{ flexDirection: 'row', marginTop: 30, gap: 10 }}>
                                        <ButtonPrimary texto={bloq ? "DESBLOQUEAR" : "BLOQUEAR"} onPress={() => bloquear(u.nick)} style={{ flex: 1, backgroundColor: bloq ? THEME.danger : '#999' }} />
                                        {!bloq && <ButtonPrimary texto="MENSAGEM" onPress={() => abrirChatDireto(u)} style={{ flex: 1 }} />}
                                    </View>
                                )}
                            </View>
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        );
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <ImageViewing images={zoomImages} imageIndex={0} visible={zoomVisible} onRequestClose={() => setZoomVisible(false)} />
            {renderModalPerfil()}
            
            <View style={styles.conteudoPrincipal}>
                {salvando && (
                    <View style={{position: 'absolute', zIndex: 999, top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center'}}>
                        <View style={{backgroundColor: 'white', padding: 20, borderRadius: 10, alignItems: 'center'}}><ActivityIndicator size="large" color={THEME.primary} /><Text style={{marginTop: 10}}>Salvando perfil...</Text></View>
                    </View>
                )}

                {abaAtual === 'perfil' && (
                    <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: 150 }]}>
                        <Text style={styles.pageTitle}>Meu Perfil</Text>
                        <TouchableOpacity onPress={() => upFoto(0)} style={styles.myProfilePicContainer}>
                            {minhasFotos[0] ? <Image source={{ uri: minhasFotos[0] }} style={styles.myProfilePic} /> : <Ionicons name="camera" size={40} color="#ccc" />}
                            <View style={styles.editIconBadge}><Ionicons name="pencil" size={12} color="white" /></View>
                        </TouchableOpacity>
                        <Text style={styles.sectionLabel}>Minhas Fotos</Text>
                        <View style={styles.gridFotos}>
                            {[1, 2, 3].map(i => (
                                <TouchableOpacity key={i} style={styles.boxFotoSmall} onPress={() => upFoto(i)}>
                                    {minhasFotos[i] ? <Image source={{ uri: minhasFotos[i] }} style={styles.imgPerfil} /> : <Ionicons name="add" size={24} color="#ccc" />}
                                </TouchableOpacity>
                            ))}
                        </View>
                        <InputModerno placeholder="Nome" value={meuNome} onChangeText={setMeuNome} />
                        <InputModerno placeholder="Idade" value={minhaIdade} onChangeText={setMinhaIdade} keyboardType='numeric' />
                        <View style={{ flexDirection: 'row', marginBottom: 15, backgroundColor: THEME.inputBg, borderRadius: 15, padding: 5 }}>
                            {['masculino', 'feminino'].map(g => (
                                <TouchableOpacity key={g} onPress={() => setMeuGenero(g)} style={[styles.genderBtn, meuGenero === g && styles.genderBtnActive]}>
                                    <Text style={[styles.genderTxt, meuGenero === g && { color: 'white' }]}>{g}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                        <InputModerno placeholder="Bio" value={minhaBio} onChangeText={setMinhaBio} multiline />
                        <ButtonPrimary texto="SALVAR PERFIL" onPress={handleSalvarPerfil} />
                        <TouchableOpacity onPress={logout} style={{ marginTop: 20, padding: 10 }}><Text style={{ color: 'red', textAlign: 'center', fontWeight: 'bold' }}>SAIR DA CONTA</Text></TouchableOpacity>
                    </ScrollView>
                )}

                {abaAtual === 'comunidade' && (
                    <View style={{ flex: 1 }}>
                        <View style={styles.headerSimples}><Text style={styles.pageTitle}>Comunidade</Text></View>
                        <FlatList 
                            data={todosPerfis.filter(u => u.nick !== meuNick)} keyExtractor={(item) => item.nick}
                            renderItem={({ item }) => <ContactCard item={item} onPress={() => setModalPerfilUser(item)} />} 
                            contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
                            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefreshComunidade} />}
                        />
                    </View>
                )}

                {abaAtual === 'conversas' && (
                    <View style={{ flex: 1 }}>
                        <View style={styles.headerSimples}><Text style={styles.pageTitle}>Conversas</Text></View>
                        <View style={styles.searchContainer}>
                            <Text style={{ fontWeight: 'bold', marginBottom: 10, color: '#555' }}>QUEM VOCÊ PROCURA?</Text>
                            <View style={{ flexDirection: 'row', marginBottom: 15 }}>
                                {['homem', 'mulher', 'todos'].map(p => (
                                    <TouchableOpacity key={p} style={[styles.filterBtn, preferenciaBusca === p && styles.filterBtnActive]} onPress={() => setPreferenciaBusca(p)}>
                                        <Text style={[styles.filterTxt, preferenciaBusca === p && { color: 'white' }]}>{p}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                            <ButtonPrimary 
                                texto={!buscando ? "BUSCAR PARCEIRO" : "CANCELAR BUSCA"} 
                                onPress={() => !buscando ? socket.emit('procurar_parceiro', preferenciaBusca) : socket.emit('cancelar_busca')} 
                                style={buscando ? {backgroundColor: THEME.danger} : {}}
                            />
                        </View>
                        <FlatList 
                            data={contatos} keyExtractor={(item) => item.idSala}
                            renderItem={({ item }) => {
                                const live = todosPerfis.find(p => p.nick === item.nick) || item;
                                return <ContactCard item={live} onPress={() => { setChatAtivo(item); socket.emit('pedir_comunidade', ''); }} />;
                            }} 
                            contentContainerStyle={{ padding: 20, paddingBottom: 100 }} 
                        />
                    </View>
                )}
            </View>
            <View style={styles.tabBar}>
                <TouchableOpacity style={styles.tabItem} onPress={() => setAbaAtual('conversas')}><Ionicons name={abaAtual === 'conversas' ? "chatbubbles" : "chatbubbles-outline"} size={24} color={abaAtual === 'conversas' ? THEME.primary : '#ccc'} /></TouchableOpacity>
                <TouchableOpacity style={styles.tabItem} onPress={() => { setAbaAtual('comunidade'); socket.emit('pedir_comunidade', '') }}><Ionicons name={abaAtual === 'comunidade' ? "people" : "people-outline"} size={24} color={abaAtual === 'comunidade' ? THEME.primary : '#ccc'} /></TouchableOpacity>
                <TouchableOpacity style={styles.tabItem} onPress={() => setAbaAtual('perfil')}><Ionicons name={abaAtual === 'perfil' ? "person" : "person-outline"} size={24} color={abaAtual === 'perfil' ? THEME.primary : '#ccc'} /></TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}