import * as React from 'react';
import {
  View,
  Text,
  Button,
  Image,
  TextInput,
  StyleSheet,
  ImageBackground,
  TouchableOpacity,
  StatusBar,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';

const Stack = createNativeStackNavigator();

// 🔹 Barra de pesquisa
function SearchBar({ value, onChange }) {
  return (
    <View style={styles.searchContainer}>
      <Ionicons name="search" size={20} color="white" style={styles.icon} />
      <TextInput
        style={styles.searchInput}
        placeholder="Pesquisar..."
        placeholderTextColor="white"
        value={value}
        onChangeText={onChange}
      />
    </View>
  );
}

// 🔹 Tela de boas-vindas
function WelcomeScreen({ navigation }) {
  const [name, setName] = React.useState('');

  const handleStart = async () => {
    if (name.trim() !== '' && name.length < 8) {
      await AsyncStorage.setItem('userName', name);
      navigation.replace('Home');
    } else {
      alert('Nome inválido ou excedeu 8 caracteres');
    }
  };

  return (
    <View style={styles.centered}>
      <Text style={styles.title}>Bem-vindo!</Text>
      <TextInput
        placeholder="Digite seu nome"
        value={name}
        onChangeText={setName}
        style={styles.input}
      />
      <Button title="Começar" onPress={handleStart} />
    </View>
  );
}

const AVAILABLE_COLORS = [
  '#4CAF50',
  '#FF9800',
  '#00BCD4',
  '#E91E63',
  '#9C27B0',
  '#FFD700',
  '#000000',
  '#8B4513',
];
const AVAILABLE_ICONS = [
  'pricetag',
  'book',
  'briefcase',
  'home',
  'school',
  'star',
  'save',
  'heart',
];

// 🔹 Tela principal
function HomeScreen({ navigation }) {
  const [search, setSearch] = React.useState('');
  const [todayTasks, setTodayTasks] = React.useState([]);
  const [categories, setCategories] = React.useState([]);

  const [modalVisible, setModalVisible] = React.useState(false);
  const [newTaskTitle, setNewTaskTitle] = React.useState('');
  const [newTaskHour, setNewTaskHour] = React.useState('');
  const [newTaskTime, setNewTaskTime] = React.useState(new Date());
  const [showTimePicker, setShowTimePicker] = React.useState(false);
  const [selectedCategory, setSelectedCategory] = React.useState(null);
  const [upcomingTasks, setUpcomingTasks] = React.useState([]);
  const [notifVisible, setNotifVisible] = React.useState(false);

  // Nova categoria
  const [newCategoryName, setNewCategoryName] = React.useState('');
  const [newCategoryColor, setNewCategoryColor] = React.useState(
    AVAILABLE_COLORS[0]
  );
  const [newCategoryIcon, setNewCategoryIcon] = React.useState(
    AVAILABLE_ICONS[0]
  );

  const [upcomingCount, setUpcomingCount] = React.useState(0);

  React.useEffect(() => {
    const updateCount = () => {
      const now = new Date();
      const upcoming = todayTasks.filter((task) => {
        const [h, m] = task.hour.split(':').map(Number);
        const taskDate = new Date();
        taskDate.setHours(h, m, 0, 0);
        return (
          !task.completed &&
          taskDate - now <= 60 * 60 * 1000 &&
          taskDate - now > 0
        );
      });
      setUpcomingCount(upcoming.length);
      setUpcomingTasks(upcoming);
    };

    updateCount();
    const interval = setInterval(updateCount, 60000); // atualiza a cada minuto
    return () => clearInterval(interval);
  }, [todayTasks]);

  React.useEffect(() => {
    const loadTodayTasks = async () => {
      try {
        const storedTasks = await AsyncStorage.getItem('tasks');
        const storedCategories = await AsyncStorage.getItem('categories');
        const { todayStr } = getTodayAndTomorrow();

        const parsedTasks = storedTasks ? JSON.parse(storedTasks) : [];
        const parsedCategories = storedCategories
          ? JSON.parse(storedCategories)
          : [];
        setCategories(parsedCategories);

        const todayGroup = parsedTasks.find((g) => g.date === todayStr);
        if (todayGroup) {
          const sortedItems = todayGroup.items.sort((a, b) => {
            const [ha, ma] = a.hour.split(':').map(Number);
            const [hb, mb] = b.hour.split(':').map(Number);
            return ha * 60 + ma - (hb * 60 + mb);
          });
          setTodayTasks(sortedItems);
        } else {
          setTodayTasks([]);
        }
      } catch (error) {
        console.log('Erro ao carregar tarefas do dia:', error);
      }
    };

    const unsubscribe = navigation.addListener('focus', loadTodayTasks);
    loadTodayTasks();
    return unsubscribe;
  }, [navigation]);

  const getCategoryIcon = (categoryName, fallbackIcon) => {
    const cat = categories.find((c) => c.name === categoryName);
    return cat ? cat.icon : fallbackIcon;
  };

  const getCategoryColor = (categoryName, fallbackColor) => {
    const cat = categories.find((c) => c.name === categoryName);
    return cat ? cat.color : fallbackColor;
  };

  const toggleTaskCompleted = async (index) => {
    try {
      const storedTasks = await AsyncStorage.getItem('tasks');
      const { todayStr } = getTodayAndTomorrow();
      const parsedTasks = storedTasks ? JSON.parse(storedTasks) : [];

      const todayGroupIndex = parsedTasks.findIndex((g) => g.date === todayStr);
      if (todayGroupIndex === -1) return;

      parsedTasks[todayGroupIndex].items[index].completed =
        !parsedTasks[todayGroupIndex].items[index].completed;

      await AsyncStorage.setItem('tasks', JSON.stringify(parsedTasks));
      setTodayTasks([...parsedTasks[todayGroupIndex].items]);
    } catch (error) {
      console.log('Erro ao marcar tarefa como concluída:', error);
    }
  };

  const handleTimeChange = (event, selectedDate) => {
    setShowTimePicker(false);
    if (selectedDate) {
      setNewTaskTime(selectedDate);
      const hours = selectedDate.getHours().toString().padStart(2, '0');
      const minutes = selectedDate.getMinutes().toString().padStart(2, '0');
      setNewTaskHour(`${hours}:${minutes}`);
    }
  };

  const handleAddTodayTask = async () => {
    if (
      !newTaskTitle ||
      !newTaskHour ||
      (!selectedCategory && !newCategoryName)
    ) {
      Alert.alert(
        'Campos incompletos',
        'Preencha todos os campos antes de salvar.'
      );
      return;
    }

    try {
      const storedTasks = await AsyncStorage.getItem('tasks');
      const storedCategories = await AsyncStorage.getItem('categories');
      const { todayStr } = getTodayAndTomorrow();
      const parsedTasks = storedTasks ? JSON.parse(storedTasks) : [];
      const parsedCategories = storedCategories
        ? JSON.parse(storedCategories)
        : [];

      let categoryToUse = selectedCategory;

      // Criar nova categoria se fornecida
      if (newCategoryName.trim()) {
        const newCat = {
          name: newCategoryName.trim(),
          color: newCategoryColor,
          icon: newCategoryIcon,
        };
        parsedCategories.push(newCat);
        setCategories(parsedCategories);
        categoryToUse = newCat;
        setNewCategoryName('');
        setNewCategoryColor(AVAILABLE_COLORS[0]);
        setNewCategoryIcon(AVAILABLE_ICONS[0]);
        await AsyncStorage.setItem(
          'categories',
          JSON.stringify(parsedCategories)
        );
      }

      const openNotifModal = () => {
        const { todayStr } = getTodayAndTomorrow();
        const upcoming = todayTasks.filter((task) => {
          const [h, m] = task.hour.split(':').map(Number);
          const now = new Date();
          return (
            !task.completed &&
            (h > now.getHours() ||
              (h === now.getHours() && m > now.getMinutes()))
          );
        });
        setUpcomingTasks(upcoming);
        setNotifVisible(true);
      };

      const newTask = {
        title: newTaskTitle,
        hour: newTaskHour,
        category: categoryToUse.name,
        color: categoryToUse.color,
        icon: categoryToUse.icon,
        completed: false,
      };

      const todayIndex = parsedTasks.findIndex((g) => g.date === todayStr);
      if (todayIndex !== -1) {
        parsedTasks[todayIndex].items.push(newTask);
      } else {
        parsedTasks.push({ date: todayStr, items: [newTask] });
      }

      const todayGroup = parsedTasks.find((g) => g.date === todayStr);
      if (todayGroup) {
        todayGroup.items.sort((a, b) => {
          const [ha, ma] = a.hour.split(':').map(Number);
          const [hb, mb] = b.hour.split(':').map(Number);
          return ha * 60 + ma - (hb * 60 + mb);
        });
        setTodayTasks(todayGroup.items);
      }

      await AsyncStorage.setItem('tasks', JSON.stringify(parsedTasks));
      setNewTaskTitle('');
      setNewTaskHour('');
      setSelectedCategory(null);
      setModalVisible(false);
    } catch (error) {
      console.log('Erro ao adicionar tarefa de hoje:', error);
    }
  };

  const deleteTask = async (index) => {
    try {
      const storedTasks = await AsyncStorage.getItem('tasks');
      const { todayStr } = getTodayAndTomorrow();
      const parsedTasks = storedTasks ? JSON.parse(storedTasks) : [];

      const todayGroupIndex = parsedTasks.findIndex((g) => g.date === todayStr);
      if (todayGroupIndex === -1) return;

      parsedTasks[todayGroupIndex].items.splice(index, 1); // remove a tarefa

      await AsyncStorage.setItem('tasks', JSON.stringify(parsedTasks));
      setTodayTasks([...parsedTasks[todayGroupIndex].items]);
    } catch (error) {
      console.log('Erro ao excluir tarefa:', error);
    }
  };

  return (
    <ImageBackground
      source={require('./assets/Bghome.png')}
      style={styles.background}
      resizeMode="cover">
      <BlurView
        intensity={30}
        tint="dark"
        style={StyleSheet.absoluteFillObject}
      />

      <View style={styles.headerRow}>
        <View style={{ flex: 1 }} />
        <Text style={styles.sectionTitle}>Lista de Tarefas</Text>
        <TouchableOpacity
          style={{
            flex: 1,
            alignItems: 'flex-end',
            paddingRight: 5,
            marginRight: 11,
          }}
          onPress={() => {
            // Filtra tarefas próximas
            const now = new Date();
            const upcoming = todayTasks.filter((task) => {
              const [h, m] = task.hour.split(':').map(Number);
              const taskDate = new Date();
              taskDate.setHours(h, m, 0, 0);
              return !task.completed && taskDate - now > 0;
            });
            setUpcomingTasks(upcoming);
            setNotifVisible(true);
          }}>
          <Ionicons name="notifications-outline" size={35} color="#fff" />
          {upcomingTasks.length > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{upcomingTasks.length}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.container}>
        <SearchBar value={search} onChange={setSearch} />

        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={styles.touchable}
            onPress={() => navigation.navigate('Details')}>
            <Image
              source={require('./assets/buttomimg.png')}
              style={styles.buttonImage}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.touchable}
            onPress={() => navigation.navigate('NewScreen')}>
            <Image
              source={require('./assets/secondButon.png')}
              style={styles.buttonImage}
            />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.itemList}>
        <View style={styles.todayHeader}>
          <Text style={styles.todayTitle}>Tarefas de Hoje</Text>
          <TouchableOpacity
            onPress={() => setModalVisible(true)}
            style={styles.addButton}>
            <Ionicons name="add-circle" size={28} color="#fff" />
          </TouchableOpacity>
        </View>

        <ScrollView>
          {todayTasks.length === 0 ? (
            <Text style={styles.emptyText}>Nenhuma tarefa para hoje ✨</Text>
          ) : (
            todayTasks.map((task, index) => (
              <View
                style={[
                  styles.taskItem,
                  {
                    backgroundColor: task.completed
                      ? 'rgba(0,205,55,0.3)' // verde suave quando concluída
                      : hexToRgba(task.color || '#ccc', 0.3), // cor da tarefa com opacidade
                  },
                ]}>
                {/* Touchable para toda a tarefa */}
                <TouchableOpacity
                  onPress={() => toggleTaskCompleted(index)}
                  style={{
                    flex: 1,
                    flexDirection: 'row',
                    alignItems: 'center',
                  }}>
                  {/* Checkbox à esquerda */}
                  <Ionicons
                    name={
                      task.completed ? 'checkmark-circle' : 'ellipse-outline'
                    }
                    size={23}
                    color={task.completed ? 'rgb(0, 63, 0)' : 'rgb(0,0,0,0.4)'}
                    style={{ marginRight: 10 }}
                  />

                  {/* Ícone da categoria */}
                  <View
                    style={[
                      styles.categoryIcon,
                      {
                        backgroundColor: getCategoryColor(task.category),
                        marginRight: 10,
                      },
                    ]}>
                    <Ionicons
                      name={getCategoryIcon(task.category)}
                      size={22}
                      color="#fff"
                    />
                  </View>

                  {/* Detalhes da tarefa */}
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        styles.taskTitle,
                        task.completed && {
                          textDecorationLine: 'line-through',
                        },
                      ]}>
                      {task.title}
                    </Text>
                    <Text style={styles.taskSubtitle}>
                      🕐 {task.hour} • #{task.category}
                    </Text>
                  </View>
                </TouchableOpacity>

                {/* Botão de excluir */}
                <TouchableOpacity
                  onPress={() => deleteTask(index)}
                  style={{ marginLeft: 10 }}>
                  <Ionicons name="trash-outline" size={23} color="#f44336" />
                </TouchableOpacity>
              </View>
            ))
          )}
        </ScrollView>
      </View>

      <View style={styles.buttonsSafe} />

      {/* Modal nova tarefa com criação de categoria */}
      <Modal
        transparent
        animationType="fade"
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}>
        <BlurView
          intensity={60}
          tint="dark"
          style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: 'rgba(0,0,0,0.7)',
          }}>
          <View
            style={{
              width: '85%',
              backgroundColor: 'rgba(86, 185, 195,0.15)',
              borderRadius: 20,
              padding: 20,
              maxHeight: '85%',
            }}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text
                style={{
                  color: '#fff',
                  fontSize: 20,
                  fontWeight: 'bold',
                  marginBottom: 15,
                }}>
                Nova Tarefa de Hoje
              </Text>

              {/* Título da tarefa */}
              <TextInput
                placeholder="Tarefa"
                placeholderTextColor="#ccc"
                style={styles.homeModalInput}
                value={newTaskTitle}
                onChangeText={setNewTaskTitle}
              />

              {/* SELETOR DE HORÁRIO DIFERENTE PARA IOS */}
              <Text
                style={{
                  color: '#fff',
                  marginBottom: 8,
                  fontWeight: 'bold',
                }}>
                Horário:
              </Text>

              {Platform.OS === 'ios' ? (
                <>
                  <TouchableOpacity
                    onPress={() => setShowTimePicker(!showTimePicker)}
                    style={{
                      backgroundColor: 'rgba(255,255,255,0.1)',
                      borderRadius: 8,
                      paddingVertical: 12,
                      paddingHorizontal: 15,
                      marginBottom: 10,
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}>
                    <Text style={{ color: '#fff' }}>
                      {newTaskHour ? `🕒 ${newTaskHour}` : 'Selecionar horário'}
                    </Text>
                    <Ionicons name="time-outline" size={20} color="#fff" />
                  </TouchableOpacity>

                  {showTimePicker && (
                    <View
                      style={{
                        backgroundColor: 'rgba(0,0,0,0.3)',
                        borderRadius: 10,
                        marginBottom: 10,
                      }}>
                      <DateTimePicker
                        value={newTaskTime}
                        mode="time"
                        display="spinner"
                        onChange={handleTimeChange}
                        textColor="#fff"
                      />
                    </View>
                  )}
                </>
              ) : (
                <>
                  <TouchableOpacity onPress={() => setShowTimePicker(true)}>
                    <TextInput
                      placeholder="Selecione o horário"
                      placeholderTextColor="#ccc"
                      style={styles.homeModalInput}
                      value={newTaskHour}
                      editable={false}
                    />
                  </TouchableOpacity>

                  {showTimePicker && (
                    <DateTimePicker
                      value={newTaskTime}
                      mode="time"
                      display="default"
                      onChange={handleTimeChange}
                    />
                  )}
                </>
              )}

              {/* Categoria */}
              <Text
                style={{
                  color: '#fff',
                  marginTop: 5,
                  marginBottom: 8,
                  fontWeight: 'bold',
                }}>
                Categoria:
              </Text>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ marginBottom: 10 }}>
                {categories.map((cat) => (
                  <TouchableOpacity
                    key={cat.name}
                    style={{
                      backgroundColor:
                        selectedCategory?.name === cat.name
                          ? cat.color
                          : 'rgba(255,255,255,0.1)',
                      borderRadius: 10,
                      padding: 10,
                      alignItems: 'center',
                      marginRight: 8,
                    }}
                    onPress={() => setSelectedCategory(cat)}>
                    <Ionicons
                      name={cat.icon}
                      size={20}
                      color={
                        selectedCategory?.name === cat.name ? '#fff' : '#ccc'
                      }
                    />
                    <Text
                      style={{
                        color:
                          selectedCategory?.name === cat.name ? '#fff' : '#ccc',
                        fontSize: 12,
                        marginTop: 4,
                      }}>
                      {cat.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Criar nova categoria */}
              <TextInput
                placeholder="Ou crie uma nova categoria"
                placeholderTextColor="#ccc"
                style={styles.homeModalInput}
                value={newCategoryName}
                onChangeText={setNewCategoryName}
              />

              {/* Cores */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ marginBottom: 10 }}>
                {AVAILABLE_COLORS.map((c) => (
                  <TouchableOpacity
                    key={c}
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: 15,
                      backgroundColor: c,
                      marginRight: 8,
                      borderWidth: newCategoryColor === c ? 2 : 0,
                      borderColor: '#fff',
                    }}
                    onPress={() => setNewCategoryColor(c)}
                  />
                ))}
              </ScrollView>

              {/* Ícones */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ marginBottom: 10 }}>
                {AVAILABLE_ICONS.map((i) => (
                  <TouchableOpacity
                    key={i}
                    style={{
                      padding: 8,
                      marginRight: 8,
                      backgroundColor:
                        newCategoryIcon === i
                          ? 'rgba(255,255,255,0.2)'
                          : 'rgba(0,0,0,0.1)',
                      borderRadius: 8,
                    }}
                    onPress={() => setNewCategoryIcon(i)}>
                    <Ionicons name={i} size={20} color="#fff" />
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Botões */}
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-around',
                  marginTop: 10,
                  marginBottom: 10,
                }}>
                <TouchableOpacity
                  style={[
                    styles.homeModalButton,
                    { backgroundColor: '#f44336' },
                  ]}
                  onPress={() => setModalVisible(false)}>
                  <Text style={{ color: '#fff', fontWeight: 'bold' }}>
                    Cancelar
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.homeModalButton,
                    { backgroundColor: '#4CAF50' },
                  ]}
                  onPress={handleAddTodayTask}>
                  <Text style={{ color: '#fff', fontWeight: 'bold' }}>
                    Salvar
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </BlurView>
      </Modal>

      <Modal
        transparent
        visible={notifVisible}
        animationType="fade"
        onRequestClose={() => setNotifVisible(false)}>
        <View style={styles.notifBackdrop}>
          <View style={styles.notifModal}>
            <Text
              style={{
                color: '#fff',
                fontSize: 18,
                fontWeight: 'bold',
                marginBottom: 10,
              }}>
              Tarefas Próximas
            </Text>
            {upcomingTasks.length === 0 ? (
              <Text style={{ color: '#ccc' }}>Nenhuma tarefa próxima ✨</Text>
            ) : (
              upcomingTasks.map((task, idx) => (
                <View
                  key={idx}
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    marginBottom: 8,
                    backgroundColor: 'rgb(255,255,255,0.2)',
                    padding: 10,
                    borderRadius: 6,
                  }}>
                  <Text style={{ color: '#fff', fontWeight: 'bold' }}>
                    🔴 {task.title}
                  </Text>
                  <Text style={{ color: '#ccc', fontWeight: 'bold' }}>
                    {task.hour}
                  </Text>
                </View>
              ))
            )}
            <TouchableOpacity
              style={{ marginTop: 10, alignSelf: 'center', width: '100%' }}
              onPress={() => setNotifVisible(false)}>
              <Text
                style={{
                  color: '#4CAF50',
                  fontWeight: 'bold',
                  textAlign: 'center',
                }}>
                Fechar
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ImageBackground>
  );
}

// 🔹 Funções utilitárias
function getDayName(dateStr) {
  const [day, month, year] = dateStr.split('/').map(Number);
  const date = new Date(year, month - 1, day);
  const days = [
    'Domingo',
    'Segunda',
    'Terça',
    'Quarta',
    'Quinta',
    'Sexta',
    'Sábado',
  ];
  return days[date.getDay()];
}

function getTodayAndTomorrow() {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  const format = (d) =>
    `${String(d.getDate()).padStart(2, '0')}/${String(
      d.getMonth() + 1
    ).padStart(2, '0')}/${d.getFullYear()}`;

  return { todayStr: format(today), tomorrowStr: format(tomorrow) };
}

function TaskSearchBar({ searchText, setSearchText }) {
  return (
    <View style={styles.searchContainer}>
      <Ionicons
        name="search-outline"
        size={20}
        color="#ccc"
        style={{ marginRight: 8 }}
      />
      <TextInput
        style={styles.searchInput}
        placeholder="Pesquisar tarefa / categoria..."
        placeholderTextColor="#ccc"
        value={searchText}
        onChangeText={setSearchText}
      />
    </View>
  );
}

function hexToRgba(hex, alpha = 1) {
  // Remove o "#" se existir
  hex = hex.replace('#', '');
  // Converte valores curtos (ex: #FFF)
  if (hex.length === 3) {
    hex = hex
      .split('')
      .map((c) => c + c)
      .join('');
  }
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// 🔹 Tela de detalhes (com atualização automática + modal)
// 🔹 Tela de detalhes atualizada
function DetailsScreen({ route }) {
  const { todayStr, tomorrowStr } = getTodayAndTomorrow();

  const [tasks, setTasks] = React.useState([]);
  const [categories, setCategories] = React.useState([]);
  const [dataLoaded, setDataLoaded] = React.useState(false); // ✅ flag para controlar carregamento
  const [selectedDate, setSelectedDate] = React.useState('');

  const [showLateModal, setShowLateModal] = React.useState(false);
  const [showAddModal, setShowAddModal] = React.useState(false);
  const [showCategoryModal, setShowCategoryModal] = React.useState(false);
  const [searchText, setSearchText] = React.useState('');
  const [hideDone, setHideDone] = React.useState(false);

  const [newTaskDate, setNewTaskDate] = React.useState(todayStr);
  const [newTaskHour, setNewTaskHour] = React.useState('');
  const [newTaskTitle, setNewTaskTitle] = React.useState('');
  const [newTaskCategory, setNewTaskCategory] = React.useState('');
  const [showDatePicker, setShowDatePicker] = React.useState(false);
  const [showTimePicker, setShowTimePicker] = React.useState(false);

  const [newCategoryName, setNewCategoryName] = React.useState('');
  const [showIconPicker, setShowIconPicker] = React.useState(false);
  const [selectedIcon, setSelectedIcon] = React.useState('pricetag');
  const [newTaskColor, setNewTaskColor] = React.useState('#3A8DFF');

  React.useEffect(() => {
    if (route.params?.onlyToday) {
      const { todayStr } = getTodayAndTomorrow();
      setSelectedDate(todayStr); // força data de hoje
    }
  }, [route.params]);

  // ✅ Carregar dados apenas uma vez ao abrir o app
  React.useEffect(() => {
    const loadData = async () => {
      try {
        const storedTasks = await AsyncStorage.getItem('tasks');
        if (storedTasks) setTasks(JSON.parse(storedTasks));

        const storedCategories = await AsyncStorage.getItem('categories');
        if (storedCategories) {
          setCategories(JSON.parse(storedCategories));
        } else {
          const defaultCategories = [
            { name: '#Saúde', icon: 'heart', color: '#e74c3c' },
            { name: '#Trabalho', icon: 'briefcase', color: '#3498db' },
            { name: '#Casa', icon: 'home', color: '#2ecc71' },
            { name: '#Financeiro', icon: 'cash', color: '#f1c40f' },
          ];
          setCategories(defaultCategories);
          await AsyncStorage.setItem(
            'categories',
            JSON.stringify(defaultCategories)
          );
        }

        setDataLoaded(true); // ✅ só marca como carregado ao final
      } catch (error) {
        console.log('Erro ao carregar dados:', error);
      }
    };

    loadData();
  }, []);

  // ✅ Salvar tarefas apenas após carregamento inicial
  React.useEffect(() => {
    if (dataLoaded) {
      AsyncStorage.setItem('tasks', JSON.stringify(tasks)).catch((err) =>
        console.log('Erro ao salvar tarefas:', err)
      );
    }
  }, [tasks, dataLoaded]);

  // ✅ Salvar categorias apenas após carregamento inicial
  React.useEffect(() => {
    if (dataLoaded) {
      AsyncStorage.setItem('categories', JSON.stringify(categories)).catch(
        (err) => console.log('Erro ao salvar categorias:', err)
      );
    }
  }, [categories, dataLoaded]);

  // 🔹 Separar tarefas
  const getSeparatedTasks = React.useCallback(() => {
    const validTasks = [];
    const pastTasks = [];
    const now = new Date();
    now.setSeconds(0, 0);

    tasks.forEach((group) => {
      const [d, m, y] = group.date.split('/').map(Number);
      const dateObj = new Date(y, m - 1, d);
      dateObj.setHours(0, 0, 0, 0);

      const futureItems = [];
      group.items.forEach((item) => {
        const [hour, minute] = item.hour.split(':').map(Number);
        const taskDateTime = new Date(dateObj);
        taskDateTime.setHours(hour, minute, 0, 0);

        if (taskDateTime < now) pastTasks.push({ ...item, date: group.date });
        else futureItems.push(item);
      });

      if (futureItems.length > 0)
        validTasks.push({ date: group.date, items: futureItems });
    });

    validTasks.sort((a, b) => {
      const [da, ma, ya] = a.date.split('/').map(Number);
      const [db, mb, yb] = b.date.split('/').map(Number);
      return new Date(ya, ma - 1, da) - new Date(yb, mb - 1, db);
    });

    validTasks.forEach((group) => {
      group.items.sort((a, b) => {
        const [ha, ma] = a.hour.split(':').map(Number);
        const [hb, mb] = b.hour.split(':').map(Number);
        return ha * 60 + ma - (hb * 60 + mb);
      });
    });

    return { validTasks, pastTasks };
  }, [tasks]);

  const { validTasks, pastTasks } = getSeparatedTasks();

  // 🔹 Filtro de pesquisa
  const filteredValidTasks = validTasks
    .map((group) => ({
      ...group,
      items: group.items.filter(
        (task) =>
          (task.title.toLowerCase().includes(searchText.toLowerCase()) ||
            task.category.toLowerCase().includes(searchText.toLowerCase())) &&
          (!hideDone || !task.done)
      ),
    }))
    .filter((group) => group.items.length > 0);

  const filteredLateTasks = pastTasks.filter(
    (t) =>
      t.title.toLowerCase().includes(searchText.toLowerCase()) ||
      t.category.toLowerCase().includes(searchText.toLowerCase())
  );

  // 🔹 Adicionar tarefa
  const handleAddTask = async () => {
    if (!newTaskHour || !newTaskTitle || !newTaskCategory || !newTaskDate)
      return;

    let categoryToUse = newTaskCategory;
    if (!categories.find((c) => c.name === newTaskCategory.name)) {
      categoryToUse = {
        name: newTaskCategory.name,
        icon: newTaskCategory.icon || 'pricetag',
        color: newTaskCategory.color || '#3A8DFF',
      };
      const updatedCategories = [...categories, categoryToUse];
      setCategories(updatedCategories);
      await AsyncStorage.setItem(
        'categories',
        JSON.stringify(updatedCategories)
      );
    }

    const newItem = {
      hour: newTaskHour,
      title: newTaskTitle,
      category: categoryToUse.name,
      color: newTaskColor,
      done: false,
    };

    setTasks((prev) => {
      const updated = [...prev];
      const existing = updated.find((g) => g.date === newTaskDate);
      if (existing) existing.items.push(newItem);
      else updated.push({ date: newTaskDate, items: [newItem] });
      return updated;
    });

    // Resetar campos
    setNewTaskHour('');
    setNewTaskTitle('');
    setNewTaskCategory('');
    setShowAddModal(false);
  };

  // 🔹 Excluir tarefa
  const handleDeleteTask = (taskDate, taskTitle) => {
    setTasks((prev) =>
      prev
        .map((group) => {
          if (group.date === taskDate) {
            const newItems = group.items.filter((i) => i.title !== taskTitle);
            return { ...group, items: newItems };
          }
          return group;
        })
        .filter((g) => g.items.length > 0)
    );
  };

  // 🔹 Alternar concluída
  const handleToggleDone = (taskDate, taskTitle) => {
    setTasks((prev) =>
      prev.map((group) => {
        if (group.date === taskDate) {
          const updatedItems = group.items.map((item) =>
            item.title === taskTitle ? { ...item, done: !item.done } : item
          );
          return { ...group, items: updatedItems };
        }
        return group;
      })
    );
  };

  // 🔹 Adicionar nova categoria
  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return;

    const newCat = {
      name: newCategoryName.trim(),
      icon: selectedIcon || 'pricetag',
      color: '#3A8DFF',
    };

    const updatedCategories = [...categories, newCat];
    setCategories(updatedCategories);
    await AsyncStorage.setItem('categories', JSON.stringify(updatedCategories));

    setNewTaskCategory(newCat);
    setNewCategoryName('');
    setSelectedIcon('pricetag');
  };

  const getCategoryIcon = (categoryName, fallbackIcon = 'pricetag') => {
    const cat = categories.find((c) => c.name === categoryName);
    return cat ? cat.icon : fallbackIcon;
  };

  const getCategoryColor = (categoryName, fallbackColor = '#ccc') => {
    const cat = categories.find((c) => c.name === categoryName);
    return cat ? cat.color : fallbackColor;
  };

  return (
    <ImageBackground
      source={require('./assets/Bghome.png')}
      style={{ flex: 1 }}
      resizeMode="cover">
      <BlurView
        intensity={40}
        tint="dark"
        style={{ ...StyleSheet.absoluteFillObject }}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}>
        <ScrollView
          style={{ flex: 1, padding: 20 }}
          contentContainerStyle={{ paddingBottom: 200 }}>
          {/* Header */}
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 10,
            }}>
            <Text style={{ fontSize: 28, fontWeight: 'bold', color: '#fff' }}>
              Tarefas
            </Text>
            <TouchableOpacity onPress={() => setShowAddModal(true)}>
              <Ionicons name="add-circle-outline" size={38} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Botão Ocultar/Exibir concluídas */}
          <TouchableOpacity
            style={{
              alignSelf: 'flex-start',
              marginBottom: 10,
              flexDirection: 'row',
              alignItems: 'center',
            }}
            onPress={() => setHideDone(!hideDone)}>
            <Ionicons
              name={hideDone ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color="#fff"
            />
            <Text style={{ color: '#fff', marginLeft: 6 }}>
              {hideDone ? 'Exibir concluídas' : 'Ocultar concluídas'}
            </Text>
          </TouchableOpacity>

          {/* Lista de tarefas */}
          {filteredValidTasks.map((group, idx) => {
            const label =
              group.date === todayStr
                ? 'Hoje'
                : group.date === tomorrowStr
                ? 'Amanhã'
                : getDayName(group.date);
            return (
              <View key={idx} style={{ marginBottom: 25 }}>
                <Text
                  style={{
                    fontSize: 18,
                    fontWeight: 'bold',
                    color: '#fff',
                    marginBottom: 10,
                  }}>
                  {label}{' '}
                  <Text style={{ fontSize: 14, color: '#ddd' }}>
                    ({group.date})
                  </Text>
                </Text>
                {group.items.map((task, i) => (
                  <TouchableOpacity
                    key={i}
                    activeOpacity={0.4}
                    onPress={() => handleToggleDone(group.date, task.title)}>
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: 12,
                        borderRadius: 12,
                        backgroundColor: task.done
                          ? 'rgba(46,204,113,0.5)'
                          : task.color
                          ? hexToRgba(task.color, 0.5)
                          : 'rgba(255,255,255,0.3)',

                        marginBottom: 10,
                      }}>
                      <View
                        style={{
                          width: 20,
                          height: 20,
                          borderRadius: 12,
                          borderWidth: 2,
                          borderColor: 'black',
                          opacity: 0.3,
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginRight: 13,
                          backgroundColor: task.done
                            ? '#2ecc71'
                            : 'transparent',
                        }}>
                        {task.done && (
                          <Ionicons name="checkmark" size={16} color="black" />
                        )}
                      </View>
                      <View
                        style={{
                          width: 30,
                          height: 30,
                          borderRadius: 15,
                          backgroundColor: getCategoryColor(task.category),
                          marginRight: 10,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}>
                        <Ionicons
                          name={getCategoryIcon(task.category)}
                          size={20}
                          color="#fff"
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text
                          style={{
                            color: task.done ? 'gray' : 'white',
                            fontSize: 17,
                            fontWeight: 'bold',
                            textShadowColor: 'rgba(0, 0, 0, 0.3)',

                            textShadowOffset: { width: 2, height: 2 },
                            textShadowRadius: 3,
                            textDecorationLine: task.done
                              ? 'line-through'
                              : 'none',
                          }}>
                          {task.title}
                        </Text>
                        <Text
                          style={{
                            color: 'rgb(255, 255, 255, 0.6)',
                            textShadowColor: 'rgba(0, 0, 0, 0.3)',

                            textShadowOffset: { width: 2, height: 2 },
                            textShadowRadius: 3,
                          }}>
                          {task.hour} 🕐
                        </Text>
                        <Text
                          style={{
                            color: '#4682B4',
                            textShadowColor: 'rgba(0, 0, 0, 0.3)',
                            fontWeight: 'bold',
                            textShadowOffset: { width: 1, height: 1 },
                            textShadowRadius: 0.2,
                          }}>
                          #{task.category}
                        </Text>
                      </View>
                      <TouchableOpacity
                        onPress={() =>
                          handleDeleteTask(group.date, task.title)
                        }>
                        <Ionicons
                          name="trash-outline"
                          size={25}
                          color="#e74c3c"
                        />
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            );
          })}
        </ScrollView>

        {/* Área inferior */}
        <View
          style={{
            position: 'absolute',
            bottom: 0,
            width: '100%',
            padding: 20,
            backgroundColor: 'rgba(0,0,0,0.3)',
          }}>
          <TaskSearchBar
            searchText={searchText}
            setSearchText={setSearchText}
          />

          {filteredLateTasks.length > 0 && (
            <TouchableOpacity
              style={styles.lateButton}
              onPress={() => setShowLateModal(true)}>
              <Ionicons name="alert-circle-outline" size={20} color="#fff" />
              <Text
                style={{ color: '#fff', marginLeft: 8, fontWeight: 'bold' }}>
                Tarefas Atrasadas ({filteredLateTasks.length})
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* 🔹 MODAL: Adicionar Tarefa */}
        <Modal
          visible={showAddModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowAddModal(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalBox}>
              <Text style={styles.modalTitle}>Nova Tarefa</Text>
              <TextInput
                placeholder="Tarefa"
                placeholderTextColor="#ccc"
                style={styles.inputModal}
                value={newTaskTitle}
                onChangeText={setNewTaskTitle}
              />

              {/* Categoria */}
              <TouchableOpacity
                style={[styles.inputModal, { justifyContent: 'center' }]}
                onPress={() => setShowCategoryModal(true)}>
                <Text style={{ color: '#fff' }}>
                  {newTaskCategory.name || 'Selecione a categoria'}
                </Text>
              </TouchableOpacity>

              {/* Modal de categorias */}
              <Modal
                visible={showCategoryModal}
                transparent
                animationType="fade">
                <View style={catStyles.overlay}>
                  <View style={catStyles.container}>
                    <Text style={catStyles.title}>Escolha uma categoria</Text>

                    <ScrollView style={{ maxHeight: 300 }}>
                      {categories.map((cat, i) => (
                        <View key={i} style={catStyles.catRow}>
                          <TouchableOpacity
                            style={[
                              catStyles.catButton,
                              newTaskCategory?.name === cat.name && {
                                backgroundColor: 'rgba(58,141,255,0.3)',
                                borderColor: '#3A8DFF',
                                borderWidth: 1,
                              },
                            ]}
                            onPress={() => {
                              setNewTaskCategory(cat);
                              setShowCategoryModal(false);
                            }}>
                            <View style={catStyles.colorDotContainer}>
                              <View
                                style={[
                                  catStyles.colorDot,
                                  { backgroundColor: cat.color || '#fff' },
                                ]}
                              />
                            </View>
                            <Ionicons
                              name={cat.icon || 'pricetag'}
                              size={20}
                              color={cat.color || '#fff'}
                              style={{ marginRight: 10 }}
                            />
                            <Text style={catStyles.catText}>{cat.name}</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={catStyles.trashButton}
                            onPress={async () => {
                              const updated = categories.filter(
                                (c) => c.name !== cat.name
                              );
                              setCategories(updated);
                              await AsyncStorage.setItem(
                                'categories',
                                JSON.stringify(updated)
                              );

                              // Se a categoria deletada estiver selecionada, limpar
                              if (newTaskCategory?.name === cat.name)
                                setNewTaskCategory('');
                            }}>
                            <Ionicons
                              name="trash-outline"
                              size={20}
                              color="#FF4D4D"
                            />
                          </TouchableOpacity>
                        </View>
                      ))}

                      {/* Criar nova categoria */}
                      <View style={catStyles.newCatSection}>
                        <View style={catStyles.newCatRow}>
                          <TextInput
                            placeholder="Nova categoria"
                            placeholderTextColor="#ccc"
                            style={catStyles.input}
                            value={newCategoryName}
                            onChangeText={setNewCategoryName}
                          />

                          <TouchableOpacity
                            style={catStyles.iconPickerButton}
                            onPress={() => setShowIconPicker(!showIconPicker)}>
                            <Ionicons
                              name={selectedIcon || 'pricetag'}
                              size={22}
                              color="#3A8DFF"
                            />
                          </TouchableOpacity>
                        </View>

                        {showIconPicker && (
                          <View style={catStyles.iconPickerList}>
                            {[
                              'briefcase',
                              'book',
                              'heart',
                              'person',
                              'home',
                              'calendar',
                              'cart',
                              'musical-notes',
                              'car',
                            ].map((icon, idx) => (
                              <TouchableOpacity
                                key={idx}
                                style={catStyles.iconOption}
                                onPress={() => {
                                  setSelectedIcon(icon);
                                  setShowIconPicker(false);
                                }}>
                                <Ionicons name={icon} size={20} color="#fff" />
                              </TouchableOpacity>
                            ))}
                          </View>
                        )}

                        <TouchableOpacity
                          style={catStyles.addButton}
                          onPress={async () => {
                            if (!newCategoryName.trim()) return;

                            const newCat = {
                              name: newCategoryName.trim(),
                              icon: selectedIcon,
                              color: '#3A8DFF',
                            };

                            const updated = [...categories, newCat];
                            setCategories(updated);
                            await AsyncStorage.setItem(
                              'categories',
                              JSON.stringify(updated)
                            );

                            // Selecionar automaticamente a categoria recém-criada
                            setNewTaskCategory(newCat);

                            setNewCategoryName('');
                            setSelectedIcon('pricetag');
                          }}>
                          <Text style={catStyles.addButtonText}>Adicionar</Text>
                        </TouchableOpacity>
                      </View>
                    </ScrollView>

                    <TouchableOpacity
                      style={catStyles.closeButton}
                      onPress={() => setShowCategoryModal(false)}>
                      <Text style={catStyles.closeButtonText}>Fechar</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </Modal>

              {/* Data */}
              <TouchableOpacity
                style={[styles.inputModal, { justifyContent: 'center' }]}
                onPress={() => setShowDatePicker(true)}>
                <Text style={{ color: '#fff' }}>
                  {newTaskDate || 'Selecione a data'}
                </Text>
              </TouchableOpacity>
              {showDatePicker && (
                <DateTimePicker
                  value={
                    newTaskDate
                      ? new Date(newTaskDate.split('/').reverse().join('-'))
                      : new Date()
                  }
                  mode="date"
                  display="calendar"
                  minimumDate={new Date()}
                  onChange={(event, selectedDate) => {
                    setShowDatePicker(false);
                    if (selectedDate) {
                      const d = selectedDate;
                      const formatted = `${String(d.getDate()).padStart(
                        2,
                        '0'
                      )}/${String(d.getMonth() + 1).padStart(
                        2,
                        '0'
                      )}/${d.getFullYear()}`;
                      setNewTaskDate(formatted);
                    }
                  }}
                />
              )}

              {/* Horário */}
              <TouchableOpacity
                style={[styles.inputModal, { justifyContent: 'center' }]}
                onPress={() => setShowTimePicker(true)}>
                <Text style={{ color: '#fff' }}>
                  {newTaskHour || 'Selecione o horário'}
                </Text>
              </TouchableOpacity>
              {showTimePicker && (
                <DateTimePicker
                  value={
                    newTaskHour
                      ? new Date(`1970-01-01T${newTaskHour}:00`)
                      : new Date()
                  }
                  mode="time"
                  display="spinner"
                  is24Hour={true}
                  onChange={(event, selectedTime) => {
                    setShowTimePicker(false);
                    if (!selectedTime) return;
                    const now = new Date();
                    const [day, month, year] = newTaskDate
                      .split('/')
                      .map(Number);
                    const selectedDateTime = new Date(
                      year,
                      month - 1,
                      day,
                      selectedTime.getHours(),
                      selectedTime.getMinutes()
                    );
                    if (selectedDateTime < now) {
                      alert('Não é permitido escolher um horário no passado!');
                      return;
                    }
                    const h = String(selectedTime.getHours()).padStart(2, '0');
                    const m = String(selectedTime.getMinutes()).padStart(
                      2,
                      '0'
                    );
                    setNewTaskHour(`${h}:${m}`);
                  }}
                />
              )}

              <Text style={{ color: '#fff', marginBottom: 8 }}>
                Cor da tarefa:
              </Text>
              <View style={{ flexDirection: 'row', marginBottom: 15 }}>
                {[
                  '#3A8DFF', // azul
                  '#000000', // preto (substitui o verde)
                  '#e67e22', // laranja
                  '#e74c3c', // vermelho
                  '#9b59b6', // roxo
                  '#3498db', // azul claro
                  '#1abc9c', // turquesa
                  '#95a5a6', // cinza
                  '#f39c12', // dourado
                ].map((color, i) => (
                  <TouchableOpacity
                    key={i}
                    onPress={() => setNewTaskColor(color)}
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: 15,
                      marginRight: 10,
                      backgroundColor: color,
                      borderWidth: newTaskColor === color ? 3 : 1,
                      borderColor:
                        newTaskColor === color
                          ? '#fff'
                          : 'rgba(255,255,255,0.3)',
                    }}
                  />
                ))}
              </View>

              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleAddTask}>
                <Text style={styles.saveButtonText}>Salvar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowAddModal(false)}>
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* 🔹 MODAL: Tarefas Atrasadas */}
        <Modal
          visible={showLateModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowLateModal(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalBox}>
              <Text style={styles.modalTitle}>Tarefas Atrasadas</Text>
              <ScrollView style={{ maxHeight: 300 }}>
                {filteredLateTasks.map((task, i) => (
                  <View
                    key={i}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: 10,
                      borderBottomWidth: 1,
                      borderColor: 'rgba(255,255,255,0.2)',
                      backgroundColor: 'rgba(255,0,0,0.4)',
                      marginTop: 10,
                      borderRadius: 8,
                    }}>
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={{ color: '#fff', fontWeight: 'bold' }}>
                        {task.title}
                      </Text>
                      <Text style={{ color: '#fff' }}>
                        {task.date} • {task.hour}
                      </Text>
                      <Text style={{ color: '#ccc' }}>{task.category}</Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => handleDeleteTask(task.date, task.title)}>
                      <Ionicons name="trash-outline" size={25} color="white" />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowLateModal(false)}>
                <Text style={styles.cancelButtonText}>Fechar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
}

const getMonthName = (monthIndex) => {
  const monthNames = [
    'Janeiro',
    'Fevereiro',
    'Março',
    'Abril',
    'Maio',
    'Junho',
    'Julho',
    'Agosto',
    'Setembro',
    'Outubro',
    'Novembro',
    'Dezembro',
  ];
  return monthNames[monthIndex];
};
// 🔹 Nova tela
function NewScreen({ navigation }) {
  const [tasks, setTasks] = React.useState([]);
  const [calendarDays, setCalendarDays] = React.useState([]);
  const [currentMonth, setCurrentMonth] = React.useState(new Date());

  React.useEffect(() => {
    loadTasks();
  }, []);

  React.useEffect(() => {
    generateCalendar();
  }, [tasks, currentMonth]);

  // 🔹 Carrega tarefas do AsyncStorage
  const loadTasks = async () => {
    try {
      const storedTasks = await AsyncStorage.getItem('tasks');
      const parsed = storedTasks ? JSON.parse(storedTasks) : [];
      setTasks(parsed);
    } catch (error) {
      console.log('Erro ao carregar tarefas:', error);
    }
  };

  // 🔹 Gera os dias do mês atual e associa as tarefas
  const generateCalendar = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const startWeekDay = firstDay.getDay(); // 0 = domingo
    const totalDays = lastDay.getDate();

    let days = [];

    // Espaços antes do primeiro dia (para alinhar o calendário)
    for (let i = 0; i < startWeekDay; i++) days.push(null);

    // Gera cada dia do mês
    for (let d = 1; d <= totalDays; d++) {
      const dateStr = `${String(d).padStart(2, '0')}/${String(
        month + 1
      ).padStart(2, '0')}/${year}`;

      const dayTasks = tasks
        .flatMap(
          (group) =>
            group.items?.map((item) => ({
              ...item,
              date: group.date,
            })) || []
        )
        .filter((t) => t.date === dateStr);

      days.push({ day: d, dateStr, tasks: dayTasks });
    }

    setCalendarDays(days);
  };

  const goToPrevMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1)
    );
  };

  const goToNextMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1)
    );
  };

  const renderDots = (day) => {
    if (!day.tasks || day.tasks.length === 0) return null;
    const colors = [
      '#3A8DFF', // azul
      '#000000', // preto
      '#e67e22', // laranja
      '#e74c3c', // vermelho
      '#9b59b6', // roxo
      '#1abc9c', // turquesa
      '#95a5a6', // cinza
      '#f39c12', // dourado
    ];
    return (
      <View style={styles.dotContainer}>
        {day.tasks.slice(0, 3).map((_, i) => (
          <View
            key={i}
            style={{
              width: 6,
              height: 6,
              borderRadius: 3,
              backgroundColor: colors[i % colors.length],
              marginHorizontal: 1,
            }}
          />
        ))}
      </View>
    );
  };

  return (
    <ImageBackground
      source={require('./assets/Bghome.png')}
      style={{ flex: 1 }}
      resizeMode="cover">
      <BlurView
        intensity={40}
        tint="dark"
        style={StyleSheet.absoluteFillObject}
      />

      <View style={{ flex: 1, padding: 20 }}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={goToPrevMonth}>
            <Ionicons name="chevron-back" size={30} color="#fff" />
          </TouchableOpacity>

          <Text style={styles.monthText}>
            {getMonthName(currentMonth.getMonth())} {currentMonth.getFullYear()}
          </Text>

          <TouchableOpacity onPress={goToNextMonth}>
            <Ionicons name="chevron-forward" size={30} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Dias da semana */}
        <View style={styles.weekRow}>
          {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((day, i) => (
            <Text key={i} style={styles.weekDay}>
              {day}
            </Text>
          ))}
        </View>

        {/* Corpo do calendário */}
        <ScrollView contentContainerStyle={styles.calendarContainer}>
          <View style={styles.grid}>
            {calendarDays.map((day, index) => (
              <View key={index} style={styles.dayBox}>
                {day ? (
                  day.tasks.length > 0 ? (
                    <TouchableOpacity
                      onPress={() =>
                        navigation.navigate('Details', {
                          selectedDate: day.dateStr,
                        })
                      }
                      style={[
                        styles.dayButton,
                        { backgroundColor: 'rgba(255,255,255,0.1)' },
                      ]}>
                      <Text style={styles.dayText}>{day.day}</Text>
                      {renderDots(day)}
                    </TouchableOpacity>
                  ) : (
                    <View style={[styles.dayButton, { opacity: 0.5 }]}>
                      <Text style={styles.dayText}>{day.day}</Text>
                    </View>
                  )
                ) : (
                  <View style={styles.emptyDay} />
                )}
              </View>
            ))}
          </View>
        </ScrollView>
      </View>
    </ImageBackground>
  );
}

// 🔹 Cabeçalho dinâmico
function HeaderTitle() {
  const [userName, setUserName] = React.useState('');

  React.useEffect(() => {
    const loadName = async () => {
      const storedName = await AsyncStorage.getItem('userName');
      if (storedName) setUserName(storedName);
    };
    loadName();
  }, []);

  return (
    <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold' }}>
      Tarefas de {userName || 'Usuário'}
    </Text>
  );
}

// 🔹 App principal
export default function App() {
  const [isLoading, setIsLoading] = React.useState(true);
  const [initialRoute, setInitialRoute] = React.useState('Welcome');

  React.useEffect(() => {
    const checkName = async () => {
      const storedName = await AsyncStorage.getItem('userName');
      if (storedName) setInitialRoute('Home');
      setIsLoading(false);
    };
    checkName();
  }, []);

  if (isLoading) return null;

  return (
    <SafeAreaProvider>
      <StatusBar backgroundColor="#1e1e2f" barStyle="light-content" />
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName={initialRoute}
          screenOptions={{
            headerStyle: { backgroundColor: '#1e1e2f' },
            headerTintColor: '#fff',
            headerTitleAlign: 'center',
            headerTitleStyle: { fontSize: 18 },
            headerStatusBarHeight: 0, // Remove padding extra
          }}>
          <Stack.Screen
            name="Welcome"
            component={WelcomeScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Home"
            component={HomeScreen}
            options={{
              headerTitle: () => <HeaderTitle />,
              headerLeft: () => (
                <View style={styles.headerPerson}>
                  <Image
                    source={{
                      uri: 'https://static.vecteezy.com/system/resources/thumbnails/019/879/186/small_2x/user-icon-on-transparent-background-free-png.png',
                    }}
                    style={styles.headerImg}
                  />
                </View>
              ),
            }}
          />
          <Stack.Screen
            name="Details"
            component={DetailsScreen}
            options={{ title: 'Tarefas da Semana' }}
          />
          <Stack.Screen
            name="NewScreen"
            component={NewScreen}
            options={{ title: 'Calendário de Tarefas' }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

// 🔹 Estilos
const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  container: { flex: 1, padding: 20 },
  input: {
    borderWidth: 1,
    borderColor: '#999',
    width: '100%',
    padding: 10,
    marginBottom: 20,
    borderRadius: 8,
  },
  headerPerson: { marginLeft: 10 },
  headerImg: { height: 35, width: 35, borderRadius: 17.5 },
  background: { flex: 1 },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
    marginVertical: 10,
  },
  icon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 16, color: '#333' },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 90,
    marginTop: 20,
  },
  touchable: {
    width: 90,
    height: 90,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 30,
  },
  buttonImage: { width: 200, height: 200, resizeMode: 'contain' },
  sectionTitle: {
    fontSize: 30,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginTop: 20,
  },
  detailsContainer: { flex: 1, backgroundColor: '#f9f9f9', padding: 20 },
  detailsTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1e1e2f',
    marginBottom: 20,
  },
  dayBlock: { marginBottom: 25 },
  dayTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  dayDate: { fontSize: 14, color: '#888' },
  taskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  taskTimeRow: { flexDirection: 'row', alignItems: 'center', marginRight: 10 },
  taskHour: { fontSize: 14, color: '#555', marginLeft: 4 },
  taskTitle: { fontSize: 16, fontWeight: '600', color: '#222' },
  lateText: { color: '#fff', marginLeft: 6, fontSize: 15, fontWeight: 'bold' },
  modalContent: {
    backgroundColor: '#fff',
    width: '85%',
    borderRadius: 15,
    padding: 20,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 15,
  },
  modalDay: { fontWeight: 'bold', color: '#1e1e2f', marginBottom: 5 },
  modalTask: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 10,
    marginBottom: 5,
  },
  taskCategory: { fontSize: 13, color: '#666' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeModal: {
    backgroundColor: '#1e1e2f',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    marginTop: 10,
  },
  inputModal: {
    borderWidth: 1,
    borderColor: '#999',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },
  saveButton: {
    backgroundColor: '#1e1e2f',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 10,
  },
  headerAddTask: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalBox: {
    width: '100%',
    backgroundColor: 'rgba(77, 126, 166, 0.95)',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 20,
  },
  inputModal: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: 10,
    padding: 12,
    color: '#fff',
    marginBottom: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  categoryButton: {
    padding: 8,
    borderRadius: 8,
    marginBottom: 6,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  categorySelected: {
    backgroundColor: '#3A8DFF',
  },
  saveButton: {
    backgroundColor: '#3A8DFF',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cancelButton: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 10,
    height: 55,
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
  },
  taskBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 10,
    overflow: 'hidden',
  },
  lateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e74c3c',
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 8,
    marginBottom: 30,
  },
  itemList: {
    backgroundColor: 'rgb(255,255,255,0.3)',
    borderTopEndRadius: 50,
    borderTopLeftRadius: 50,
    padding: 25,
    maxHeight: '80%',
  },
  buttonsSafe: {
    height: 60,
    backgroundColor: 'black',
  },
  todayTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  emptyText: {
    color: '#fff',
    textAlign: 'center',
    marginTop: 20,
    fontSize: 15,
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 15,
    padding: 12,
    marginBottom: 10,
  },
  categoryIcon: {
    borderRadius: 20,
    padding: 8,
    marginRight: 10,
  },
  taskTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 3,
  },
  taskSubtitle: {
    color: 'black',
    opacity: 0.5,
    fontSize: 13,
  },
  checkButton: {
    marginLeft: 10,
  },
  todayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  addButton: {
    padding: 4,
  },
  homeModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  homeModalBox: {
    width: '85%',
    backgroundColor: 'rgba(25,25,25,0.95)',
    borderRadius: 20,
    padding: 20,
  },
  homeModalTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  homeModalInput: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    color: '#fff',
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
  },
  homeModalButton: {
    paddingVertical: 10,
    paddingHorizontal: 25,
    borderRadius: 12,
    alignItems: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    position: 'relative',
  },

  notificationIcon: {
    position: 'absolute',
    right: 0,
    padding: 5,
  },

  badge: {
    position: 'absolute',
    right: -6,
    top: -6,
    backgroundColor: 'red',
    borderRadius: 8,
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },

  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  notifBackdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  notifModal: {
    width: '85%',
    backgroundColor: '#1e1e2f',
    borderRadius: 15,
    padding: 20,
  },
  safe: { flex: 1, padding: 10 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  monthTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    textTransform: 'capitalize',
  },
  weekDays: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 5,
  },
  weekDay: {
    color: '#fff',
    fontWeight: 'bold',
    width: '13%',
    textAlign: 'center',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    flexGrow: 1,
  },
  dayCell: {
    width: '13%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 6,
  },
  emptyCell: {
    width: '13%',
    aspectRatio: 1,
    marginVertical: 6,
  },
  dayNumber: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  backButton: {
    backgroundColor: '#3A8DFF',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  background: {
    flex: 1,
  },
  header: {
    marginTop: 50,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 25,
  },
  headerText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
  },
  calendarContainer: {
    paddingHorizontal: 10,
    paddingVertical: 20,
  },
  weekDaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 10,
  },
  weekDayText: {
    color: '#fff',
    fontWeight: 'bold',
    width: 40,
    textAlign: 'center',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  dayBox: {
    width: 45,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
    margin: 2,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  emptyDay: {
    width: 45,
    height: 60,
    margin: 2,
  },
  dayText: {
    color: '#fff',
    fontSize: 16,
  },
  dotContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  backButton: {
    position: 'absolute',
    bottom: 35,
    left: 25,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  monthText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 10,
  },
  weekDay: {
    color: '#ccc',
    fontSize: 16,
    fontWeight: 'bold',
    width: 35,
    textAlign: 'center',
  },
  calendarContainer: {
    alignItems: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  dayBox: {
    width: '13.5%',
    aspectRatio: 1,
    margin: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayButton: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  dayText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  dotContainer: {
    flexDirection: 'row',
    marginTop: 3,
  },
  emptyDay: {
    width: '100%',
    aspectRatio: 1,
  },
});

const catStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: '85%',
    backgroundColor: 'rgba(25,25,25,0.95)',
    borderRadius: 20,
    padding: 20,
  },
  title: {
    color: '#fff',
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 15,
    fontSize: 20,
  },
  catRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  catButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flex: 1,
    marginBottom: 10,
    marginRight: 6,
  },
  trashButton: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 10,
    padding: 8,
    marginBottom: 10,
  },
  catText: { color: '#fff', fontSize: 15 },
  colorDotContainer: { marginRight: 8 },
  colorDot: { width: 10, height: 10, borderRadius: 5 },
  newCatSection: { marginTop: 12 },
  newCatRow: { flexDirection: 'row', alignItems: 'center' },
  input: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    color: '#fff',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    flex: 1,
  },
  iconPickerButton: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 10,
    padding: 8,
    marginLeft: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconPickerList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  iconOption: {
    width: 40,
    height: 40,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
    marginBottom: 8,
  },
  addButton: {
    backgroundColor: '#3A8DFF',
    borderRadius: 10,
    paddingVertical: 10,
    marginTop: 10,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
    textAlign: 'center',
  },
  closeButton: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginTop: 15,
    paddingVertical: 10,
    borderRadius: 10,
  },
  closeButtonText: {
    textAlign: 'center',
    color: '#bbb',
    fontSize: 14,
    fontWeight: '600',
  },
});
