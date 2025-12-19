import React, { useState, useEffect } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { useChat } from '../contexts/ChatContext';
import { InputModerno, ButtonPrimary } from '../components';
import { styles } from '../styles';

export function LoginScreen({ navigation }) {
    const { fazerLogin, logado, faseApp } = useChat(); // Pegamos 'logado' e 'faseApp'
    const [nick, setNick] = useState('');
    const [senha, setSenha] = useState('');
    const [loading, setLoading] = useState(false);

    // --- A MÁGICA ACONTECE AQUI ---
    // Este efeito monitora a variável 'logado'. 
    // Assim que ela vira 'true', o app navega para a Home.
    useEffect(() => {
        if (logado) {
            // .replace impede que o usuário volte para o login ao apertar 'voltar'
            navigation.replace('Home'); 
        }
    }, [logado, navigation]);

    const handleLogin = () => {
        if (!nick || !senha) return;
        setLoading(true);
        fazerLogin(nick, senha);
        
        // Se demorar muito e não logar, libera o botão (timeout de segurança visual)
        setTimeout(() => setLoading(false), 5000);
    };

    return (
        <View style={styles.centro}>
            <View style={styles.loginCard}>
                <Text style={{fontSize:24, textAlign:'center', marginBottom:20, fontWeight: 'bold'}}>
                    RandoChat
                </Text>
                
                <InputModerno 
                    placeholder="@SeuNick" 
                    value={nick} 
                    onChangeText={setNick} 
                    icon="person" 
                />
                
                <InputModerno 
                    placeholder="Sua Senha" 
                    value={senha} 
                    onChangeText={setSenha} 
                    icon="lock-closed" 
                    secureTextEntry 
                />
                
                <View style={{ marginTop: 20 }}>
                    {loading && !logado ? (
                        <ActivityIndicator size="large" color="#6C63FF" />
                    ) : (
                        <ButtonPrimary texto="ENTRAR" onPress={handleLogin} />
                    )}
                </View>

                {/* Status do Auto-Login (Opcional, só pra você ver o status) */}
                {faseApp === 'boasvindas' && (
                    <Text style={{textAlign: 'center', marginTop: 10, color: '#999', fontSize: 12}}>
                        Verificando login salvo...
                    </Text>
                )}
            </View>
        </View>
    );
}