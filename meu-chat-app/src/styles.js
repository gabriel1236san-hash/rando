import { StyleSheet, Dimensions, Platform, StatusBar } from 'react-native';

const { width, height } = Dimensions.get('window');

export const THEME = {
    primary: '#6C63FF', 
    secondary: '#00C853', 
    background: '#F2F2F7', 
    card: '#FFFFFF',
    text: '#1C1C1E',
    textSec: '#8E8E93',
    inputBg: '#E5E5EA',
    danger: '#FF3B30',
    chatEu: '#6C63FF',
    chatEles: '#FFFFFF',
    radius: 20
};

export const styles = StyleSheet.create({
  safeArea: { 
    flex: 1, 
    backgroundColor: THEME.background, 
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 
  },
  centro: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: THEME.background },
  conteudoPrincipal: { flex: 1, backgroundColor: THEME.background },
  scrollContent: { padding: 25 },
  pageTitle: { fontSize: 28, fontWeight: '700', color: THEME.text, marginBottom: 5 },
  sectionLabel: { fontSize: 16, fontWeight: '600', color: THEME.text, marginTop: 15, marginBottom: 10 },
  headerSimples: { paddingHorizontal: 25, paddingTop: 20, backgroundColor: THEME.background },
  
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: THEME.inputBg, borderRadius: 15, paddingHorizontal: 15, marginBottom: 15 },
  inputField: { flex: 1, paddingVertical: 15, fontSize: 16, color: THEME.text },
  btnPrimary: { backgroundColor: THEME.primary, padding: 18, borderRadius: 15, alignItems: 'center', shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 5 },
  txtBtnPrimary: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  genderBtn: { flex: 1, alignItems: 'center', padding: 10, borderRadius: 12 },
  genderBtnActive: { backgroundColor: THEME.primary },
  genderTxt: { fontWeight: '600', color: '#666' },

  cardContact: { flexDirection: 'row', alignItems: 'center', backgroundColor: THEME.card, padding: 15, borderRadius: 20, marginBottom: 15, elevation: 3 },
  avatarContainer: { position: 'relative', marginRight: 15 },
  avatarImg: { width: 55, height: 55, borderRadius: 20, backgroundColor: '#EEE' },
  statusDot: { width: 14, height: 14, borderRadius: 7, position: 'absolute', bottom: -2, right: -2, borderWidth: 2, borderColor: 'white' },
  cardTitle: { fontWeight: '700', fontSize: 16, color: THEME.text },
  cardSubtitle: { color: THEME.textSec, fontSize: 13 },
  
  searchContainer: { margin: 20, backgroundColor: 'white', padding: 20, borderRadius: 20, elevation: 5 },
  filterBtn: { flex: 1, padding: 10, alignItems: 'center', borderRadius: 10, borderWidth: 1, borderColor: '#eee', marginHorizontal: 3 },
  filterBtnActive: { backgroundColor: THEME.text, borderColor: THEME.text },
  filterTxt: { fontSize: 12, fontWeight: 'bold', color: THEME.textSec, textTransform: 'uppercase' },

  myProfilePicContainer: { width: 100, height: 100, borderRadius: 35, position: 'relative', alignSelf:'center', marginBottom:20 },
  myProfilePic: { width: '100%', height: '100%', borderRadius: 35 },
  editIconBadge: { position: 'absolute', bottom: -5, right: -5, backgroundColor: THEME.primary, padding: 8, borderRadius: 15 },
  gridFotos: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  boxFotoSmall: { width: (width-70)/3, height: (width-70)/3, backgroundColor: '#E1E1E1', borderRadius: 15, overflow: 'hidden', justifyContent:'center', alignItems:'center' },
  
  // --- CARROUSEL COM INDICADORES ---
  carouselContainer: { height: height * 0.50, marginBottom: 10 }, // Aumentei um pouco a altura total
  carouselImage: { width: width - 40, height: height * 0.45, borderRadius: 20, marginHorizontal: 20, backgroundColor:'#eee', resizeMode: 'cover' },
  imgPerfil: { width: '100%', height: '100%', resizeMode: 'cover' },
  
  // SETAS DO CARROUSEL
  setaDireita: { position: 'absolute', right: 25, top: '40%', backgroundColor: 'rgba(0,0,0,0.5)', padding: 10, borderRadius: 25, zIndex: 10 },
  setaEsquerda: { position: 'absolute', left: 25, top: '40%', backgroundColor: 'rgba(0,0,0,0.5)', padding: 10, borderRadius: 25, zIndex: 10 },
  
  // BOLINHAS DO CARROUSEL
  indicadoresContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
  indicadorDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#ccc', marginHorizontal: 4 },
  indicadorDotAtivo: { width: 10, height: 10, borderRadius: 5, backgroundColor: THEME.primary, marginHorizontal: 4 },

  headerChat: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, paddingVertical: 10, backgroundColor: 'white', borderBottomWidth: 1, borderColor: '#EEE' },
  msgRow: { flexDirection: 'row', marginVertical: 4, paddingHorizontal: 10 },
  bubble: { maxWidth: '75%', padding: 12, borderRadius: 20 },
  bubbleEu: { backgroundColor: THEME.chatEu, borderBottomRightRadius: 4 },
  bubbleEles: { backgroundColor: THEME.chatEles, borderBottomLeftRadius: 4 },
  msgText: { fontSize: 16, lineHeight: 22 },
  msgMeta: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 4, alignItems:'center' },
  imgChat: { width: 220, height: 160, borderRadius: 15, backgroundColor: '#ddd' },
  inputArea: { flexDirection: 'row', alignItems: 'center', padding: 10, backgroundColor: 'white' },
  inputChat: { flex: 1, backgroundColor: '#F2F2F7', borderRadius: 25, paddingHorizontal: 20, paddingVertical: 10, marginHorizontal: 5, maxHeight: 100 },
  
  tagCamera: { position: 'absolute', bottom: 5, left: 5, flexDirection: 'row', alignItems: 'center', backgroundColor: '#00C853', paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8, elevation: 2 },
  tagGallery: { position: 'absolute', bottom: 5, left: 5, flexDirection: 'row', alignItems: 'center', backgroundColor: '#007AFF', paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8, elevation: 2 },
  txtTag: { fontSize: 11, color: 'white', fontWeight: 'bold', marginLeft: 4 },
  
  loginCard: { width: '85%', backgroundColor: 'white', padding: 30, borderRadius: 30, elevation: 5 },
  blurContainer: { overflow: 'hidden', justifyContent: 'center', alignItems: 'center', backgroundColor: '#ddd', borderRadius: 15 },
  blurOverlay: { alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.4)', padding: 10, borderRadius: 10 },
  blurText: { color: 'white', fontWeight: 'bold' },
  
  alertaContainer: { position: 'absolute', top: Platform.OS === 'ios' ? 60 : 40, alignSelf:'center', zIndex: 999, width: '90%' },
  alertaBox: { backgroundColor: '#333', padding: 15, borderRadius: 15, flexDirection: 'row', alignItems: 'center', shadowColor: "#000", shadowOpacity: 0.3, elevation: 10 },
  alertaTexto: { color: 'white', flex: 1, fontWeight: 'bold', marginLeft: 10 },

  modalContainer: { height: '92%', backgroundColor: 'white', borderTopLeftRadius: 30, borderTopRightRadius: 30, marginTop: Platform.OS === 'ios' ? 60 : 40, shadowColor: "#000", shadowOffset: { width: 0, height: -10 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 20, overflow: 'hidden' },
  bannerBanido: { backgroundColor: THEME.danger, padding: 15, alignItems: 'center' },
  tabBar: { flexDirection: 'row', height: Platform.OS === 'ios' ? 85 : 70, backgroundColor: 'white', borderTopLeftRadius: 30, borderTopRightRadius: 30, position: 'absolute', bottom: 0, width: '100%', elevation: 10, paddingBottom: Platform.OS === 'ios' ? 20 : 0 },
  tabItem: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});