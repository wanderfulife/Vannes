<!-- CommuneSelector.vue -->
<template>
  <div class="form-group">
    <input class="form-control" type="text" v-model="searchTerm" @input="search"
      placeholder="Rechercher ou saisir une commune" />
    <div v-if="showDropdown" class="commune-dropdown">
      <div v-for="item in filteredCommunes" :key="item['CODE INSEE']" @click="selectCommune(item)"
        class="commune-option">
        {{ item.COMMUNE }} ({{ item['CODE POSTAL'] }})
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue';
const insee = ref([]);

onMounted(async () => {
  try {
    const response = await fetch('/output.json');
    insee.value = await response.json();
  } catch (error) {
    console.error('Error loading insee data:', error);
  }
});

const props = defineProps({
  modelValue: String,
  postalCodePrefix: String
});

const emit = defineEmits(['update:modelValue', 'update:postalCodePrefix']);

const searchTerm = ref('');
const showDropdown = ref(false);
const filteredCommunes = ref([]);

const search = () => {
  if (searchTerm.value.length < 2 || !insee.value.length) {
    showDropdown.value = false;
    return;
  }

  filteredCommunes.value = insee.value.filter(item => {
    if (!item) return false;

    const commune = item.COMMUNE ? item.COMMUNE.toLowerCase() : '';
    const postalCode = item['CODE POSTAL'] ? item['CODE POSTAL'].toString() : '';

    return commune.includes(searchTerm.value.toLowerCase()) ||
      postalCode.startsWith(searchTerm.value);
  }).slice(0, 100);

  showDropdown.value = filteredCommunes.value.length > 0;

  // Emit the current search term as the selected value
  emit('update:modelValue', searchTerm.value);
};

const selectCommune = (item) => {
  if (item && item.COMMUNE && item['CODE INSEE']) {
    searchTerm.value = item.COMMUNE;
    emit('update:modelValue', `${item.COMMUNE} - ${item['CODE INSEE']}`);
    emit('update:postalCodePrefix', item['CODE POSTAL'] ? item['CODE POSTAL'].toString() : '');
    showDropdown.value = false;
  }
};

watch(() => props.modelValue, (newVal) => {
  if (newVal && newVal !== searchTerm.value) {
    const [commune] = newVal.split(' - ');
    searchTerm.value = commune || newVal;
  }
});

watch(() => props.postalCodePrefix, (newVal) => {
  if (newVal && newVal !== searchTerm.value) {
    searchTerm.value = newVal;
    search();
  }
});
</script>

<style scoped>
.commune-dropdown {
  max-height: 200px;
  overflow-y: auto;
  border: 1px solid #ccc;
}

.commune-option {
  padding: 5px;
  cursor: pointer;
}

.commune-option:hover {
  background-color: #f0f0f0;
}
</style>